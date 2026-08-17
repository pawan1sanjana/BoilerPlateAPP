# 📦 BoilerplateApp - Modern Boilerplate App

[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

> A comprehensive, production-ready Boilerplate App designed to provide a professional enterprise UI for scalable applications.

## ✨ Key Features

- 📊 **Dashboard & Analytics:** Real-time metrics, KPI tracking, and interactive charts using Recharts.
- 📱 **QR Code Integration:** Instantly generate and scan QR codes for rapid data access and status updates.
- 📑 **Data Export:** Export your data seamlessly to PDF, Excel, or CSV formats.
- 🎨 **Modern UI/UX:** A beautiful, responsive interface built with Tailwind CSS, shadcn/ui, and Radix UI components.
- 🔒 **Authentication & Security:** Secure user login and role-based access management powered by Supabase.
- 🗺️ **Mapping:** Live map integration with Leaflet.

## 🛠️ Tech Stack

- **Frontend Core:** [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), Lucide Icons, Framer Motion animations
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Data Visualization:** [Recharts](https://recharts.org/)
- **Mapping:** [Leaflet](https://leafletjs.com/), Leaflet Routing Machine
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)

## 📖 User Guide

Welcome to BoilerplateApp! Here is a quick overview of the main modules available in the application and how to use them:

### 📊 Dashboard
The **Dashboard** is your command center. It provides a high-level overview, displaying key metrics, recent alerts, and interactive charts to help you monitor performance at a glance.

### 📝 Entities
Navigate to the module to manage your inventory and items.
- **View Status:** Check if items are active or out of service.
- **QR Codes:** Generate and scan unique QR codes for each item. Scanning a QR code provides instant access to details and status updates.

### 👥 Staff & Operations
Use the **Staff** and **Operations** sections to manage your team.
- **Role Assignments:** Assign users to specific roles.
- **Task Management:** Oversee daily operational tasks.

### 📑 Reports & Legal
Ensure your application runs smoothly and stays compliant.
- **Data Export:** Generate detailed reports and easily export them to PDF, Excel, or CSV for external use or auditing.

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm, yarn, pnpm, or bun

### 1. Database Setup (Supabase)
This application requires a Supabase backend to function properly.
1. Create a new project on [Supabase](https://supabase.com).
2. Navigate to the **SQL Editor** in your Supabase dashboard.
3. Run the SQL migration scripts located in the `supabase/` folder to initialize the database tables and security policies.

### 2. Environment Variables
Create a local `.env` file in the root of the project. If there's an example file, copy it:
```bash
cp .env.example .env
```
Update the `.env` file with your Supabase project credentials:
```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Installation & Running Locally
Install the dependencies and start the development server:
```bash
npm install
npm run dev
```
The application will be accessible at `http://localhost:5173`.

## 📦 Building for Production
To create an optimized production build:
```bash
npm run build
```
This command compiles the TypeScript code and bundles the application into the `dist` directory. You can preview the production build locally using:
```bash
npm run preview
```

## ☁️ Deployment

### Vercel Deployment
The application is pre-configured for seamless deployment to Vercel using the included `vercel.json` file.
1. Push your code to a Git repository (GitHub/GitLab/Bitbucket).
2. Import the repository into your Vercel dashboard.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Environment Variables section in Vercel.
4. Deploy! Client-side routing is automatically handled by the Vercel configuration.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page or submit a pull request if you have ideas for improvements.

## 📄 License
This project is licensed under the MIT License.
