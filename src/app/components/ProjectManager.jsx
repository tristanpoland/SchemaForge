// components/ProjectManager.jsx
import React, { useState, useRef } from 'react';
import { 
  Plus, Database, FolderOpen, FileText, File, Download 
} from 'lucide-react';

const ProjectManager = ({ onOpenProject, onNewProject }) => {
  const fileInputRef = useRef(null);

  // Sample projects array - add your .sf filenames here
  const sampleProjects = [
    {
      name: "E-commerce Database",
      filename: "ecommerce-schema.sf",
      description: "Complete online store schema with users, products, orders"
    },
    {
      name: "Blog Platform",
      filename: "blog-platform.sf", 
      description: "Multi-user blog system with posts, comments, categories"
    },
    // {
    //   name: "Social Media App",
    //   filename: "social-media.sf",
    //   description: "Social network schema with users, posts, follows, likes"
    // },
    // {
    //   name: "Library Management",
    //   filename: "library-system.sf",
    //   description: "Library system with books, members, loans, reservations"
    // },
    // {
    //   name: "Hospital Management",
    //   filename: "hospital-system.sf",
    //   description: "Healthcare system with patients, doctors, appointments"
    // },
    // {
    //   name: "School Management",
    //   filename: "school-system.sf",
    //   description: "Education system with students, courses, grades, enrollment"
    // }
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && (file.name.endsWith('.sf') || file.name.endsWith('.json'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target.result);
          onOpenProject(projectData, file.name);
        } catch (error) {
          alert('Error loading project file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid .sf or .json file.');
    }
    event.target.value = '';
  };

  const handleSampleProjectLoad = async (sample) => {
    try {
      const response = await fetch(`/samples/${sample.filename}`);
      if (!response.ok) {
        throw new Error(`Sample project not found: ${sample.filename}`);
      }
      const projectData = await response.json();
      onOpenProject(projectData, sample.filename);
    } catch (error) {
      alert(`Error loading sample project: ${error.message}`);
    }
  };

  return (
    <div className="w-full h-screen dark">
      <div className="w-full h-full bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="text-blue-400" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-white">SchemaForge</h1>
                <p className="text-gray-400">Professional SQL Database Designer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div 
                onClick={onNewProject}
                className="bg-gray-800 p-6 rounded-xl shadow-lg border-2 border-dashed border-gray-600 hover:border-blue-400 cursor-pointer transition-all hover:shadow-xl group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-900 rounded-lg group-hover:bg-blue-800">
                    <Plus className="text-blue-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">New Project</h3>
                    <p className="text-gray-400">Start designing a new database schema</p>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-800 p-6 rounded-xl shadow-lg border-2 border-dashed border-gray-600 hover:border-green-400 cursor-pointer transition-all hover:shadow-xl group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-900 rounded-lg group-hover:bg-green-800">
                    <FolderOpen className="text-green-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Open Project</h3>
                    <p className="text-gray-400">Load an existing .sf project file</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-900 rounded-lg">
                    <FileText className="text-purple-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Documentation</h3>
                    <p className="text-gray-400">Learn how to use SchemaForge</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Projects */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Download className="text-orange-400" size={24} />
                <h2 className="text-2xl font-bold text-white">Sample Projects</h2>
                <p className="text-gray-400">Explore pre-built database schemas</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sampleProjects.map((sample, index) => (
                  <div
                    key={index}
                    onClick={() => handleSampleProjectLoad(sample)}
                    className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 hover:border-orange-400 cursor-pointer transition-all hover:shadow-xl group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-900 rounded-lg group-hover:bg-orange-800 flex-shrink-0">
                        <Database className="text-orange-400" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-md font-semibold text-white mb-1 truncate">{sample.name}</h3>
                        <p className="text-sm text-gray-400 line-clamp-2">{sample.description}</p>
                        <div className="mt-2">
                          <span className="text-xs text-orange-400 font-mono">{sample.filename}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Getting Started */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Getting Started</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">Features</h3>
                  <ul className="space-y-3 text-gray-300">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Visual table design with drag & drop
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Real-time relationship mapping with foreign keys
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Complete MySQL data type support
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      SQL DDL generation with constraints
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Project export/import (.sf files)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Visual connection pins for relationships
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">Quick Tips</h3>
                  <ul className="space-y-3 text-gray-300">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <span>Click and drag to move tables around the canvas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <span>Connect tables using the connection pins on each field</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <span>Only one primary key allowed per table</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <span>Use edit mode to set up foreign key relationships</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <span>Yellow pins indicate primary keys, blue pins show foreign keys</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* MySQL Features */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">MySQL Support</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Numeric Types</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>TINYINT, SMALLINT, MEDIUMINT</li>
                    <li>INT, BIGINT</li>
                    <li>DECIMAL, FLOAT, DOUBLE</li>
                    <li>BIT</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">String Types</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>CHAR, VARCHAR</li>
                    <li>TEXT variants (TINY, MEDIUM, LONG)</li>
                    <li>BLOB variants (TINY, MEDIUM, LONG)</li>
                    <li>BINARY, VARBINARY</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Other Types</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>DATE, TIME, DATETIME</li>
                    <li>TIMESTAMP, YEAR</li>
                    <li>JSON</li>
                    <li>Spatial types (GEOMETRY, POINT, etc.)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* File Format Info */}
            <div className="bg-blue-950 border border-blue-800 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-900 rounded-lg">
                  <File className="text-blue-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-200 mb-2">About .sf Files</h3>
                  <p className="text-blue-300 mb-2">
                    SchemaForge uses .sf files to store your database designs. These are JSON files containing:
                  </p>
                  <ul className="text-blue-400 text-sm space-y-1">
                    <li>• Table structures with MySQL data types and constraints</li>
                    <li>• Foreign key relationships and references</li>
                    <li>• Visual layout and positioning</li>
                    <li>• Connection mappings between fields</li>
                    <li>• Project metadata and timestamps</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".sf,.json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ProjectManager;