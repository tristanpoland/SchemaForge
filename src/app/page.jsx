"use client";

// SchemaForge.jsx - Complete Main Application Component
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

// Component imports
import ProjectManager from './components/ProjectManager';
import TableNode from './components/TableNode';
import SqlModal from './components/SqlModal';
import { generateSql } from './utils/sqlGenerator';

// Icons
import { 
  Plus, Download, Trash2, Database, FileText, ArrowLeft
} from 'lucide-react';

// Define nodeTypes outside component to prevent React Flow warnings
const nodeTypes = {
  table: TableNode
};

const SchemaForge = () => {
  // Main application state
  const [currentView, setCurrentView] = useState('manager'); // 'manager' or 'designer'
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [schema, setSchema] = useState({});
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [generatedSql, setGeneratedSql] = useState('');
  
  // Project management state
  const [currentProject, setCurrentProject] = useState(null);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState('');
  
  // Refs
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Validate if two fields can form a foreign key relationship
  const validateFieldTypes = useCallback((sourceField, targetField) => {
    // Basic type must match
    if (sourceField.type !== targetField.type) {
      return {
        valid: false,
        message: `Type mismatch: ${sourceField.type} cannot reference ${targetField.type}`
      };
    }

    // For sized types, check length compatibility
    if (['VARCHAR', 'CHAR'].includes(sourceField.type)) {
      const sourceLength = parseInt(sourceField.length) || 255;
      const targetLength = parseInt(targetField.length) || 255;
      
      if (sourceLength > targetLength) {
        return {
          valid: false,
          message: `Length mismatch: ${sourceField.type}(${sourceLength}) cannot reference ${targetField.type}(${targetLength}). Source length must be ≤ target length.`
        };
      }
    }

    // For DECIMAL, check precision compatibility
    if (sourceField.type === 'DECIMAL') {
      const sourcePrecision = sourceField.length || '10,2';
      const targetPrecision = targetField.length || '10,2';
      
      if (sourcePrecision !== targetPrecision) {
        return {
          valid: false,
          message: `Precision mismatch: DECIMAL(${sourcePrecision}) cannot reference DECIMAL(${targetPrecision}). Precision and scale must match exactly.`
        };
      }
    }

    return { valid: true, message: '' };
  }, []);

  // Connection handling with automatic foreign key management and type validation
  const onConnect = useCallback((params) => {
    // Parse the handle IDs to get table and field information
    const sourceHandleId = params.sourceHandle;
    const targetHandleId = params.targetHandle;
    
    if (!sourceHandleId || !targetHandleId) return;
    
    // Extract table and field IDs from handle format: "tableId-fieldId-type"
    const [sourceTableId, sourceFieldId] = sourceHandleId.replace('-source', '').split('-');
    const [targetTableId, targetFieldId] = targetHandleId.replace('-target', '').split('-');
    
    if (!sourceTableId || !sourceFieldId || !targetTableId || !targetFieldId) return;
    
    // Get the actual tables and fields
    const sourceTable = nodes.find(n => n.id === sourceTableId);
    const targetTable = nodes.find(n => n.id === targetTableId);
    
    if (!sourceTable || !targetTable) return;
    
    const sourceField = sourceTable.data.fields?.find(f => f.id.toString() === sourceFieldId);
    const targetField = targetTable.data.fields?.find(f => f.id.toString() === targetFieldId);
    
    if (!sourceField || !targetField) return;
    
    // Validation: Target field must be a primary key
    if (!targetField.primaryKey) {
      alert('Foreign keys can only reference primary key fields');
      return;
    }
    
    // Validation: Can't connect to same table
    if (sourceTableId === targetTableId) {
      alert('Cannot create foreign key to same table');
      return;
    }

    // Validation: Check data type compatibility
    const typeValidation = validateFieldTypes(sourceField, targetField);
    if (!typeValidation.valid) {
      alert(`Cannot create foreign key relationship:\n${typeValidation.message}`);
      return;
    }
    
    // Create the visual connection
    const newEdge = {
      id: `${sourceTableId}-${sourceFieldId}-${targetTableId}-${targetFieldId}`,
      source: sourceTableId,
      target: targetTableId,
      sourceHandle: sourceHandleId,
      targetHandle: targetHandleId,
      type: 'smoothstep',
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
      data: {
        sourceField: sourceFieldId,
        targetField: targetFieldId,
        foreignKey: true
      }
    };
    
    // Update the source field to be a foreign key
    setNodes((currentNodes) => 
      currentNodes.map((node) => {
        if (node.id === sourceTableId) {
          const updatedFields = node.data.fields.map(field => {
            if (field.id.toString() === sourceFieldId) {
              return {
                ...field,
                foreignKey: true,
                referencedTable: targetTableId,
                referencedField: targetFieldId
              };
            }
            return field;
          });
          
          const updatedData = { ...node.data, fields: updatedFields };
          
          // Update schema
          setSchema(prev => ({
            ...prev,
            [sourceTableId]: updatedData
          }));
          
          return {
            ...node,
            data: updatedData
          };
        }
        return node;
      })
    );
    
    // Add the edge
    setEdges((eds) => [...eds, newEdge]);
  }, [nodes, setEdges, validateFieldTypes]);

  // Handle edge changes including deletions
  const handleEdgesChange = useCallback((changes) => {
    // Handle edge deletions to remove foreign key relationships
    changes.forEach(change => {
      if (change.type === 'remove') {
        const edge = edges.find(e => e.id === change.id);
        if (edge && edge.data?.foreignKey) {
          const sourceTableId = edge.source;
          const sourceFieldId = edge.data.sourceField;
          
          // Remove foreign key from the source field
          setNodes((currentNodes) => 
            currentNodes.map((node) => {
              if (node.id === sourceTableId) {
                const updatedFields = node.data.fields.map(field => {
                  if (field.id.toString() === sourceFieldId) {
                    return {
                      ...field,
                      foreignKey: false,
                      referencedTable: null,
                      referencedField: null
                    };
                  }
                  return field;
                });
                
                const updatedData = { ...node.data, fields: updatedFields };
                
                // Update schema
                setSchema(prev => ({
                  ...prev,
                  [sourceTableId]: updatedData
                }));
                
                return {
                  ...node,
                  data: updatedData
                };
              }
              return node;
            })
          );
        }
      }
    });
    
    // Apply the edge changes using the provided onEdgesChange
    onEdgesChange(changes);
  }, [edges, onEdgesChange]);

  // Create visual connection when FK is set via dropdown (with type validation)
  const handleCreateConnection = useCallback((sourceTableId, sourceFieldId, targetTableId, targetFieldId) => {
    // Check if connection already exists
    const existingEdge = edges.find(edge => 
      edge.source === sourceTableId && 
      edge.target === targetTableId &&
      edge.data?.sourceField === sourceFieldId.toString() &&
      edge.data?.targetField === targetFieldId.toString()
    );
    
    if (existingEdge) return; // Connection already exists

    // Get the actual fields for type validation
    const sourceTable = nodes.find(n => n.id === sourceTableId);
    const targetTable = nodes.find(n => n.id === targetTableId);
    
    if (!sourceTable || !targetTable) {
      alert('Cannot find source or target table');
      return;
    }
    
    const sourceField = sourceTable.data.fields?.find(f => f.id.toString() === sourceFieldId.toString());
    const targetField = targetTable.data.fields?.find(f => f.id.toString() === targetFieldId.toString());
    
    if (!sourceField || !targetField) {
      alert('Cannot find source or target field');
      return;
    }

    // Validation: Check data type compatibility
    const typeValidation = validateFieldTypes(sourceField, targetField);
    if (!typeValidation.valid) {
      alert(`Cannot create foreign key relationship:\n${typeValidation.message}`);
      return;
    }
    
    // Create visual connection when FK is set via dropdown
    const newEdge = {
      id: `${sourceTableId}-${sourceFieldId}-${targetTableId}-${targetFieldId}`,
      source: sourceTableId,
      target: targetTableId,
      sourceHandle: `${sourceTableId}-${sourceFieldId}-source`,
      targetHandle: `${targetTableId}-${targetFieldId}-target`,
      type: 'smoothstep',
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
      data: {
        sourceField: sourceFieldId.toString(),
        targetField: targetFieldId.toString(),
        foreignKey: true
      }
    };
    
    setEdges((eds) => [...eds, newEdge]);
  }, [edges, setEdges, nodes, validateFieldTypes]);

  // Remove visual connection when FK is unchecked via dropdown
  const handleRemoveConnection = useCallback((sourceTableId, sourceFieldId) => {
    setEdges((currentEdges) => 
      currentEdges.filter(edge => !(
        edge.source === sourceTableId && 
        edge.data?.sourceField === sourceFieldId.toString()
      ))
    );
  }, [setEdges]);

  // Add new table to the canvas
  const addTable = useCallback(() => {
    const id = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const initialData = {
      tableName: `Table_${nodes.length + 1}`,
      fields: [
        {
          id: Date.now(),
          name: 'id',
          type: 'INT',
          nullable: false,
          primaryKey: true,
          unique: true,
          autoIncrement: true,
          defaultValue: ''
        }
      ]
    };

    const newNode = {
      id,
      type: 'table',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        ...initialData,
        id, // Make sure the node has its own ID
        onCreateConnection: handleCreateConnection,
        onRemoveConnection: handleRemoveConnection,
        validateFieldTypes: validateFieldTypes,
        onUpdate: (updatedData) => {
          setNodes((currentNodes) => 
            currentNodes.map((node) => 
              node.id === id ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  ...updatedData
                } 
              } : node
            )
          );
          setSchema(prev => ({
            ...prev,
            [id]: updatedData
          }));
        }
      }
    };
    
    setNodes((currentNodes) => {
      const newNodes = [...currentNodes, newNode];
      // Update all nodes with the new allTables data
      return newNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          allTables: newNodes,
          onCreateConnection: handleCreateConnection,
          onRemoveConnection: handleRemoveConnection,
          validateFieldTypes: validateFieldTypes
        }
      }));
    });
    
    setSchema(prev => ({
      ...prev,
      [id]: initialData
    }));
  }, [nodes.length, handleCreateConnection, handleRemoveConnection]);

  // Delete selected nodes and their connections
  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    const selectedNodeIds = selectedNodes.map(node => node.id);
    
    if (selectedNodeIds.length === 0) return;
    
    setNodes((nds) => nds.filter(node => !selectedNodeIds.includes(node.id)));
    setEdges((eds) => eds.filter(edge => 
      !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
    ));
    
    setSchema(prev => {
      const newSchema = { ...prev };
      selectedNodeIds.forEach(id => delete newSchema[id]);
      return newSchema;
    });
  }, [nodes, setNodes, setEdges]);

  // Generate SQL DDL from current schema
  const handleGenerateSql = useCallback(() => {
    const sql = generateSql(schema, edges, nodes);
    setGeneratedSql(sql);
    setShowSqlModal(true);
  }, [schema, edges, nodes]);

  // Export schema as .sf file
  const exportSchema = useCallback(() => {
    const projectName = currentProject || 'Untitled Project';
    const schemaData = {
      projectName: projectName,
      nodes: nodes.map(node => ({
        ...node,
        data: schema[node.id] || node.data
      })),
      edges,
      schema,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(schemaData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.sf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, schema, currentProject]);

  // Clear all tables and connections
  const clearSchema = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all tables? This action cannot be undone.')) {
      setNodes([]);
      setEdges([]);
      setSchema({});
    }
  }, [setNodes, setEdges]);

  // Project management functions
  const handleNewProject = useCallback(() => {
    setCurrentProject('New Project');
    setNodes([]);
    setEdges([]);
    setSchema({});
    setCurrentView('designer');
  }, [setNodes, setEdges]);

  const handleOpenProject = useCallback((projectData, fileName) => {
    if (projectData.nodes && projectData.edges) {
      // Use projectName from file data, or fall back to filename, or default
      const projectName = projectData.projectName || 
                         fileName.replace('.sf', '').replace('.json', '') || 
                         'Imported Project';
      
      setCurrentProject(projectName);
      
      // Reconstruct nodes with proper callbacks
      const reconstructedNodes = projectData.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          allTables: projectData.nodes,
          onCreateConnection: handleCreateConnection,
          onRemoveConnection: handleRemoveConnection,
          validateFieldTypes: validateFieldTypes,
          onUpdate: (updatedData) => {
            setNodes((nds) => 
              nds.map((n) => 
                n.id === node.id ? { 
                  ...n, 
                  data: { 
                    ...n.data, 
                    ...updatedData,
                    allTables: nds,
                    onCreateConnection: handleCreateConnection,
                    onRemoveConnection: handleRemoveConnection,
                    validateFieldTypes: validateFieldTypes
                  } 
                } : n
              )
            );
            setSchema(prev => ({
              ...prev,
              [node.id]: updatedData
            }));
          }
        }
      }));
      
      setNodes(reconstructedNodes);
      setEdges(projectData.edges || []);
      setSchema(projectData.schema || {});
      setCurrentView('designer');
    }
  }, [setNodes, setEdges, handleCreateConnection, handleRemoveConnection]);

  const handleBackToManager = useCallback(() => {
    setCurrentView('manager');
  }, []);

  // Project name editing functions (Google Docs style)
  const handleProjectNameDoubleClick = useCallback(() => {
    setTempProjectName(currentProject || 'Untitled Project');
    setIsEditingProjectName(true);
  }, [currentProject]);

  const handleProjectNameSave = useCallback(() => {
    if (tempProjectName.trim()) {
      setCurrentProject(tempProjectName.trim());
    }
    setIsEditingProjectName(false);
  }, [tempProjectName]);

  const handleProjectNameKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleProjectNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingProjectName(false);
    }
  }, [handleProjectNameSave]);

  // Apply dark mode on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Render project manager view
  if (currentView === 'manager') {
    return (
      <ProjectManager 
        onOpenProject={handleOpenProject}
        onNewProject={handleNewProject}
      />
    );
  }

  // Render main designer view
  return (
    <div className="w-full h-screen dark">
      <div className="w-full h-full bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBackToManager}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="flex items-center gap-2">
                <Database className="text-blue-400" size={24} />
                <div>
                  {isEditingProjectName ? (
                    <input
                      value={tempProjectName}
                      onChange={(e) => setTempProjectName(e.target.value)}
                      onBlur={handleProjectNameSave}
                      onKeyPress={handleProjectNameKeyPress}
                      className="text-xl font-bold text-white bg-gray-700 px-2 py-1 rounded border border-gray-600 outline-none focus:border-blue-400"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                    />
                  ) : (
                    <h1 
                      className="text-xl font-bold text-white cursor-pointer hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                      onDoubleClick={handleProjectNameDoubleClick}
                      title="Double-click to rename project"
                    >
                      {currentProject || 'Untitled Project'}
                    </h1>
                  )}
                  <div className="text-xs text-gray-400">SchemaForge Designer</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={addTable}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Add Table
              </button>
              
              <button 
                onClick={deleteSelectedNodes}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={16} />
                Delete Selected
              </button>
              
              <div className="w-px h-6 bg-gray-600 mx-2" />
              
              <button 
                onClick={handleGenerateSql}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileText size={16} />
                Generate SQL
              </button>
              
              <button 
                onClick={exportSchema}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Download size={16} />
                Save Project
              </button>
              
              <button 
                onClick={clearSchema}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Trash2 size={16} />
                Clear All
              </button>
            </div>
          </div>
        </div>
        
        {/* React Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            fitView
            style={{ backgroundColor: '#111827' }}
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Controls className="dark" />
            <MiniMap 
              nodeColor="#374151"
              maskColor="rgba(0, 0, 0, 0.6)"
            />
            <Background 
              color="#374151" 
              gap={16} 
            />
            
            <Panel position="bottom-right" className="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-600">
              <div className="text-sm text-gray-300">
                <div>Tables: {Object.keys(schema).length}</div>
                <div>Relationships: {edges.length}</div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
        
        {/* SQL Modal */}
        {showSqlModal && (
          <SqlModal 
            sql={generatedSql}
            onClose={() => setShowSqlModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SchemaForge;