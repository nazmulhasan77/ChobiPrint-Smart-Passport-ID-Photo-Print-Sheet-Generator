# ChobiPrint - Smart Passport & ID Photo Print Sheet Generator

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8.svg)](https://tailwindcss.com/)
[![Print DPI](https://img.shields.io/badge/Print_DPI-300_High_Res-emerald.svg)]()
[![Privacy](https://img.shields.io/badge/Privacy-100%25_Client_Side-success.svg)]()

> *"Chobi"* means *Picture* or *Photograph* in Bengali. **ChobiPrint** is a modern, privacy-first web utility designed to simplify studio-grade ID and passport photo printing for everyone.

Instead of opening complex, heavy desktop software like Adobe Photoshop, **ChobiPrint** allows users to crop, arrange, and print standard passport, stamp, and custom ID photos on A4 photo paper with zero hassle, optimal 2D packing, straight cutting lanes, and 300 DPI lab quality.

<p align="center">
  <img src="Screenshot.png" alt="ChobiPrint Application Preview" width="100%" />
</p>

---

## 🌟 Key Features

- **📱 Smartphone / Photoshop-Style Drag Cropping**:
  - Interactive crop box with 8 resizable handles (4 corners + 4 edges).
  - Drag corners and edges to cut into the picture from any side.
  - Aspect ratio locking per dimension standard, plus an optional freeform crop toggle.
  - Optional biometric face oval guide for international passport standards.

- **📄 28 Passport Copies on 1 Single A4 Sheet**:
  - Standard Bangladeshi passport photos ($40 \times 50\text{ mm}$ or $50 \times 40\text{ mm}$) tile in a precise **$4\text{ columns} \times 7\text{ rows} = 28\text{ copies}$** grid on a standard A4 sheet ($210 \times 297\text{ mm}$).

- **✂️ Straight Guillotine Cutting Lanes**:
  - Continuous, unbroken horizontal and vertical cut channels across rows and columns.
  - Easily slice entire strips using a standard paper trimmer, rotary cutter, ruler & blade, or scissors.
  - Even distribution of border whitespace between images for comfortable trimming.

- **🌱 Smart Paper-Saving Layout**:
  - Top-aligned vertical packing leaves all unused photo paper consolidated in one clean block at the bottom.
  - Dashed cut-line indicator shows exactly where to cut to preserve clean, unprinted photo paper for future printer runs.

- **🗂️ Multi-Photo Queue with Independent Settings**:
  - Add multiple distinct photos in one session.
  - Each photo card supports independent dimension presets, custom sizes, horizontal/vertical toggles, and copy counts.

- **🔒 100% Private & Client-Side**:
  - All processing is performed locally in your browser using HTML5 Canvas.
  - **Zero cloud uploads**—your personal photographs never leave your computer.

- **🖨️ Professional High-Resolution Export**:
  - **300 DPI Vector/Raster PDF** (scaled to true millimeter units using `jsPDF`).
  - **300 DPI PNG Images** ($2480 \times 3508\text{ px}$).
  - **Direct Browser 1:1 Scale Print** via `@media print`.

---

## 📐 Supported Standard Dimensions

| Preset Name | Dimensions (Metric) | Dimensions (Imperial) | Resolution @ 300 DPI | Common Usages |
| :--- | :--- | :--- | :--- | :--- |
| **Passport (Studio Standard)** | **40 × 50 mm** | 1.57 × 1.97 in | 472 × 591 px | Bangladesh job applications, university/college admissions, BCS, CV |
| **Passport (Official MRP / e-Passport)** | **45 × 55 mm** | 1.77 × 2.17 in | 531 × 650 px | Bangladesh official physical passport & visa application forms |
| **Passport / Visa (International)** | **35 × 45 mm** | 1.38 × 1.77 in | 413 × 531 px | Bangladesh visa, international IDs, Schengen, UK, Canada |
| **Stamp Size (স্ট্যাম্প সাইজ)** | **20 × 25 mm** | 0.79 × 0.98 in | 236 × 295 px | Admit cards, student IDs, registration papers, revenue stamps |
| **Square (US Visa / Embassy)** | **50.8 × 50.8 mm** (2×2") | 2.00 × 2.00 in | 600 × 600 px | US Visa (DS-160), Diversity Visa (DV), square portraits |
| **Square (1.5 × 1.5")** | **38.1 × 38.1 mm** | 1.50 × 1.50 in | 450 × 450 px | Institutional ID cards |
| **Square (Micro Stamp 1 × 1")** | **25.4 × 25.4 mm** | 1.00 × 1.00 in | 300 × 300 px | Compact micro square stamps |
| **Custom Dimensions** | *User Defined* | `mm`, `cm`, `inch`, `px` | Custom calculated | Any customized frame or ID card dimension |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18 or newer recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/nazmulhasan77/ChobiPrint-Smart-Passport-ID-Photo-Print-Sheet-Generator.git

# Navigate to project folder
cd ChobiPrint-Smart-Passport-ID-Photo-Print-Sheet-Generator

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open your browser at `http://localhost:5173/` to use the application.

### Production Build

```bash
npm run build
```

The optimized production output will be generated inside the `dist/` directory.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)
- **Image Processing**: HTML5 Canvas API (High-DPI 300 DPI rendering)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
