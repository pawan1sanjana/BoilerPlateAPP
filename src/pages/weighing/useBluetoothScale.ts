import { useState, useRef, useCallback } from 'react'

// Standard Bluetooth Weight Scale GATT UUIDs
const WEIGHT_SCALE_SERVICE = 0x181d
const WEIGHT_MEASUREMENT_CHAR = 0x2a9d

export type ScaleUnit = 'kg' | 'lb' | 'jin'

export interface BluetoothScaleConfig {
  /** Optional custom service UUID — falls back to standard 0x181D */
  serviceUuid?: string | number
  /** Optional custom characteristic UUID — falls back to standard 0x2A9D */
  characteristicUuid?: string | number
}

export interface ScaleReading {
  weight: number
  unit: ScaleUnit
  timestamp: Date
}

export interface UseBluetoothScaleReturn {
  isConnected: boolean
  isConnecting: boolean
  deviceName: string | null
  weight: number | null
  unit: ScaleUnit
  error: string | null
  lastReading: ScaleReading | null
  connect: (config?: BluetoothScaleConfig) => Promise<void>
  disconnect: () => void
  clearError: () => void
}

/** Parses the standard Weight Measurement characteristic (0x2A9D) */
function parseWeightMeasurement(data: DataView): { weight: number; unit: ScaleUnit } {
  const flags = data.getUint8(0)
  // bit 0: measurement units (0 = SI/kg, 1 = imperial/lb)
  const isImperial = (flags & 0x01) !== 0
  // Weight is in the next 2 bytes, little-endian, in units of 5g (SI) or 0.01lb (imperial)
  const rawWeight = data.getUint16(1, true)
  const weight = isImperial ? rawWeight * 0.01 : rawWeight * 0.005
  const unit: ScaleUnit = isImperial ? 'lb' : 'kg'
  return { weight: parseFloat(weight.toFixed(3)), unit }
}

/** Heuristic parser for common proprietary BLE scale protocols */
function parseRawData(data: DataView): { weight: number; unit: ScaleUnit } | null {
  if (data.byteLength < 2) return null
  try {
    // Many scales send weight as little-endian uint16 in units of 10g at bytes 1-2
    const raw = data.getUint16(1, true)
    if (raw > 0 && raw < 50000) {
      return { weight: parseFloat((raw * 0.01).toFixed(2)), unit: 'kg' }
    }
    // Try big-endian at bytes 0-1
    const rawBe = data.getUint16(0, false)
    if (rawBe > 0 && rawBe < 50000) {
      return { weight: parseFloat((rawBe * 0.01).toFixed(2)), unit: 'kg' }
    }
  } catch {}
  return null
}

export function useBluetoothScale(): UseBluetoothScaleReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [weight, setWeight] = useState<number | null>(null)
  const [unit, setUnit] = useState<ScaleUnit>('kg')
  const [error, setError] = useState<string | null>(null)
  const [lastReading, setLastReading] = useState<ScaleReading | null>(null)

  const deviceRef = useRef<BluetoothDevice | null>(null)
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)
  const isStandardProtocol = useRef(true)

  const handleDisconnect = useCallback(() => {
    setIsConnected(false)
    setWeight(null)
    setDeviceName(null)
    deviceRef.current = null
    characteristicRef.current = null
  }, [])

  const handleCharacteristicValueChanged = useCallback((event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic
    const data = characteristic.value
    if (!data) return

    let reading: { weight: number; unit: ScaleUnit } | null = null

    if (isStandardProtocol.current) {
      try {
        reading = parseWeightMeasurement(data)
      } catch {
        reading = parseRawData(data)
      }
    } else {
      reading = parseRawData(data)
    }

    if (reading && reading.weight > 0) {
      setWeight(reading.weight)
      setUnit(reading.unit)
      const newReading: ScaleReading = {
        weight: reading.weight,
        unit: reading.unit,
        timestamp: new Date(),
      }
      setLastReading(newReading)
    }
  }, [])

  const connect = useCallback(async (config?: BluetoothScaleConfig) => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const serviceUuid = config?.serviceUuid ?? WEIGHT_SCALE_SERVICE
      const characteristicUuid = config?.characteristicUuid ?? WEIGHT_MEASUREMENT_CHAR

      // Request BLE device — accept any device that has the weight scale service
      // or any device if using custom UUIDs
      const filters: RequestDeviceOptions = {
        acceptAllDevices: false,
        filters: [{ services: [serviceUuid] }],
        optionalServices: [serviceUuid],
      }

      let device: BluetoothDevice
      try {
        device = await navigator.bluetooth.requestDevice(filters)
        isStandardProtocol.current = serviceUuid === WEIGHT_SCALE_SERVICE
      } catch {
        // Fallback: accept all devices (user can manually pair)
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [serviceUuid],
        })
        isStandardProtocol.current = false
      }

      deviceRef.current = device
      setDeviceName(device.name ?? 'Unknown Scale')

      device.addEventListener('gattserverdisconnected', handleDisconnect)

      const server = await device.gatt!.connect()
      let service: BluetoothRemoteGATTService

      try {
        service = await server.getPrimaryService(serviceUuid)
      } catch {
        // Try getting any available service
        const services = await server.getPrimaryServices()
        if (services.length === 0) throw new Error('No GATT services found on this device.')
        service = services[0]
      }

      let characteristic: BluetoothRemoteGATTCharacteristic
      try {
        characteristic = await service.getCharacteristic(characteristicUuid)
      } catch {
        // Try the first notifiable characteristic
        const chars = await service.getCharacteristics()
        const notifiable = chars.find(c => c.properties.notify || c.properties.indicate)
        if (!notifiable) throw new Error('No notifiable characteristic found. This device may not be compatible.')
        characteristic = notifiable
      }

      characteristicRef.current = characteristic
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged)
      await characteristic.startNotifications()

      setIsConnected(true)
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('cancelled')) {
        setError('Device selection cancelled.')
      } else if (err?.name === 'SecurityError') {
        setError('Bluetooth access denied. Please allow Bluetooth permissions in your browser.')
      } else {
        setError(err?.message ?? 'Failed to connect to scale. Please check the device is powered on and in range.')
      }
      handleDisconnect()
    } finally {
      setIsConnecting(false)
    }
  }, [handleDisconnect, handleCharacteristicValueChanged])

  const disconnect = useCallback(() => {
    if (characteristicRef.current) {
      try {
        characteristicRef.current.stopNotifications().catch(() => {})
        characteristicRef.current.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged)
      } catch {}
    }
    if (deviceRef.current?.gatt?.connected) {
      try { deviceRef.current.gatt.disconnect() } catch {}
    }
    handleDisconnect()
  }, [handleDisconnect, handleCharacteristicValueChanged])

  const clearError = useCallback(() => setError(null), [])

  return {
    isConnected,
    isConnecting,
    deviceName,
    weight,
    unit,
    error,
    lastReading,
    connect,
    disconnect,
    clearError,
  }
}
