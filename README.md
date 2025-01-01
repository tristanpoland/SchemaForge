# SchemaForge 🔨

A modern, intuitive database schema designer built with React. Create, visualize, and export database structures with ease.

## ✨ Features

- **Visual Table Creation**: Drag-and-drop interface for creating and arranging database tables
- **Smart Relationships**: Automatically visualizes foreign key relationships between tables
- **Rich Data Types**: Supports common SQL data types with an intuitive selection interface
- **Real-time Preview**: See your database structure come to life as you build it
- **SQL Export**: Generate SQL creation scripts with a single click
- **Interactive Editing**: Edit table structures with an intuitive form interface
- **Dark Mode**: Easy on the eyes with a modern dark theme

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm/yarn/pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/tristanpoland/SchemaForge.git

# Navigate to project directory
cd SchemaForge

# Install dependencies
npm install

# Start the development server
npm run dev
```

## 🛠 Usage

1. **Create Tables**
   - Click "Add Table" to create a new table
   - Each table comes with default ID and timestamp columns
   - Drag tables around the canvas to organize your schema

2. **Edit Tables**
   - Click the edit icon on any table to modify its structure
   - Add, remove, or modify columns
   - Set primary keys and foreign key relationships
   - Name your tables and columns

3. **Define Relationships**
   - Create foreign key relationships by selecting from available primary keys
   - Relationships are automatically visualized with arrows
   - Easy to understand which tables are connected

4. **Export Your Schema**
   - Click "Generate SQL" to export your schema as SQL CREATE statements
   - The generated SQL is compatible with most SQL databases

## 🎨 Tech Stack

- React 18
- Tailwind CSS
- Radix UI Primitives
- shadcn/ui Components
- Lucide Icons

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
