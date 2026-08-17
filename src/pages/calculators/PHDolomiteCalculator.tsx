import React, { useState } from 'react';
import { Calculator, RotateCcw, FileDown, Info } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { addPdfHeader, addPdfFootersToAllPages, autoTable } from '@/lib/exportUtils';
import html2canvas from 'html2canvas';

interface CalculationResult {
  rate: string;
  totalKg: string;
  bags: string;
  status: 'Ideal' | 'Acidic' | 'High';
}

export default function PHDolomiteCalculator() {
  const [currentPH, setCurrentPH] = useState('');
  const [area, setArea] = useState('');
  const [unit, setUnit] = useState('hectares');
  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculate = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPH || !area) return;

    const phValue = parseFloat(currentPH);
    let rate = 0; // Tons per Hectare

    // TEA RESEARCH INSTITUTE (TRI) STANDARDS FOR SRI LANKA
    if (phValue < 4.0) {
      rate = 4.0;
    } else if (phValue < 4.5) {
      rate = 2.0;
    } else if (phValue < 5.0) {
      rate = 1.0;
    } else if (phValue < 5.5) {
      rate = 0.5;
    } else {
      rate = 0.0;
    }

    let hectares = parseFloat(area);
    if (unit === 'acres') hectares *= 0.404686;
    if (unit === 'perches') hectares *= 0.002529;

    const totalKg = rate * hectares * 1000;

    setResult({
      rate: (rate * 1000).toFixed(0),
      totalKg: totalKg.toFixed(0),
      bags: (totalKg / 50).toFixed(0), // 50kg bags
      status: phValue >= 4.5 && phValue <= 5.5 ? 'Ideal' : phValue < 4.5 ? 'Acidic' : 'High'
    });
  };

  const generatePDF = async () => {
    if (!result) return;
    const doc = new jsPDF();
    const date = new Date().toLocaleString();

    const startY = addPdfHeader(doc, {
      title: 'Dolomite Analysis Report',
      subtitle: 'Calculation based on Tea Research Institute (TRI) guidelines',
    });

    autoTable(doc, {
      startY: startY + 10,
      head: [['Input Parameters', 'Value']],
      body: [
        ['Soil pH', currentPH],
        ['Land Area', `${area} ${unit}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Calculation Results', 'Value']],
      body: [
        ['Recommended Rate', `${result.rate} KG / Hectare`],
        ['Total Quantity', `${result.totalKg} KG`],
        ['Bags Required (50kg)', `${result.bags} Bags`],
        ['Status', result.status]
      ],
      theme: 'grid',
      headStyles: { fillColor: [240, 253, 244], textColor: [21, 128, 61], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    const guidelinesElement = document.getElementById('pdf-guidelines');
    if (guidelinesElement) {
      const canvas = await html2canvas(guidelinesElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const imgProps = doc.getImageProperties(imgData);
      
      const margin = 14;
      const pdfWidth = doc.internal.pageSize.getWidth() - (margin * 2);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let currentY = (doc as any).lastAutoTable.finalY + 15;
      
      if (currentY + pdfHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.addImage(imgData, 'PNG', margin, currentY, pdfWidth, pdfHeight);
    }

    addPdfFootersToAllPages(doc);

    doc.save(`Dolomite_Report_${date.split(',')[0].replace(/\//g, '-')}.pdf`);
  };

  const reset = () => {
    setCurrentPH('');
    setArea('');
    setResult(null);
  };

  // PH Marker position logic
  const getMarkerPosition = () => {
    if (!currentPH) return '50%';
    const ph = parseFloat(currentPH);
    const clamped = Math.min(Math.max(ph, 3), 9);
    return `${((clamped - 3) / 6) * 100}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-500" />
            Dolomite Calculator
          </h1>
          <p className="text-sm text-slate-500 mt-1">Calculation based on Tea Research Institute (TRI) guidelines.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-sm flex items-center gap-2">
            <RotateCcw size={18} />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
          <form onSubmit={calculate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                 Soil pH (3.0 - 9.0)
              </label>
              <input 
                type="number" 
                step="0.1"
                min="3"
                max="9"
                value={currentPH}
                onChange={(e) => setCurrentPH(e.target.value)}
                placeholder="e.g. 5.5"
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-base outline-none font-bold text-blue-600 shadow-sm"
              />
              {/* pH Indicator Bar */}
              <div className="mt-4 h-2.5 bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-400 to-blue-700 rounded-full relative overflow-visible shadow-inner">
                <div 
                  className="absolute w-1.5 h-4.5 bg-slate-900 dark:bg-white rounded-full -top-1 transition-all duration-700 shadow-md ring-2 ring-white dark:ring-slate-900"
                  style={{ left: getMarkerPosition() }}
                ></div>
                <div className="absolute top-5 left-0 right-0 flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                  <span>3.0</span>
                  <span>4.5</span>
                  <span>5.5</span>
                  <span>7.0</span>
                  <span>9.0</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Land Area</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Size"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Unit</label>
                  <select 
                    value={unit} 
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm outline-none font-bold"
                  >
                    <option value="hectares">Hectares</option>
                    <option value="acres">Acres</option>
                    <option value="perches">Perches</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all mt-6 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Calculator size={20} /> Calculate Requirements
            </button>
          </form>
        </div>

        {/* Results Card */}
        <div className="space-y-6">
          <div className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border transition-all duration-500 ${result ? 'border-blue-500/50 bg-blue-50/10' : 'border-slate-200 dark:border-slate-800 opacity-50'}`}>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-center">Dosage Recommendations</h3>
            {result ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Input pH</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{currentPH}</p>
                    <span className={`text-[9px] font-bold uppercase tracking-tight ${result.status === 'Ideal' ? 'text-green-500' : 'text-amber-500'}`}>{result.status} Status</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">KG / Hectare</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{result.rate}</p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Standard Rate</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-center col-span-2">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Mandatory Quantity</p>
                    <p className="text-3xl font-black text-blue-600">{result.totalKg} <span className="text-sm">KG</span></p>
                    <p className="text-[10px] font-bold text-blue-600/70 uppercase pt-1">≈ {result.bags} Bags (50kg Each)</p>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button onClick={generatePDF} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                    <FileDown size={14} /> Export PDF
                  </button>
                  <button onClick={reset} className="flex-1 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-500/20 transition-all flex items-center justify-center gap-2">
                    <RotateCcw size={14} /> Clear Result
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300">
                  <Calculator size={24} />
                </div>
                <p className="text-sm text-slate-400">Complete analysis form to <br /> create recommendations</p>
              </div>
            )}
          </div>

          <div className="p-4 rounded-3xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30">
            <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Info size={14} /> Technical Standard
            </h4>
            <p className="text-[10px] text-blue-700 dark:text-blue-500 leading-relaxed font-medium">
              Calculation based on Tea Research Institute (TRI) Circular 01/24. Maintain 6-week interval between Dolomite and Fertilization.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden Guidelines for PDF Export to perfectly render Sinhala script */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -100 }}>
        <div id="pdf-guidelines" style={{ width: '800px', backgroundColor: 'white', padding: '0', fontFamily: 'helvetica, Arial, sans-serif' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: '#f8fafc', color: '#475569', padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                  Guidelines for Application / යෙදුම් උපදෙස්
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', lineHeight: '1.6' }}>
                  1. Apply Dolomite when the soil is moist.<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;පසෙහි තෙතමනය ඇති විට ඩොලමයිට් යොදන්න.
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', lineHeight: '1.6' }}>
                  2. Maintain at least a 6-week interval between Dolomite and chemical fertilizers.<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;රසායනික පොහොර සමග ඩොලමයිට් යෙදීමෙන් වළකින්න. අවම වශයෙන් සති 6 ක පරතරයක් තබා ගන්න.
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', lineHeight: '1.6' }}>
                  3. Broadcast evenly over the soil surface around the tea bush.<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;තේ පඳුර වටා පස මතුපිටට සමසේ විසුරුවා හරින්න.
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px 14px', color: '#1e293b', lineHeight: '1.6' }}>
                  4. Fork the soil lightly to incorporate Dolomite.<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;ඩොලමයිට් පසට මිශ්‍ර වීම සඳහා පස මඳක් බුරුල් කරන්න.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
