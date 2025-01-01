"use client"
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, FileText, Move, ZoomIn, ZoomOut, X, Edit2 } from 'lucide-react';

const DATA_TYPES = {
  numeric: ['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'],
  text: ['VARCHAR', 'TEXT', 'CHAR'],
  date: ['DATE', 'TIMESTAMP', 'TIME'],
  binary: ['BLOB', 'BINARY'],
  boolean: ['BOOLEAN']
};

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { Checkbox } from "@/components/ui/Checkbox"

const TableNode = ({ 
  table, 
  position, 
  onDragStart, 
  onDrag, 
  onDragEnd,
  onEdit,
  onDelete,
  scale,
  allTables,  // Add this to get all tables for foreign key selection
  onUpdateForeignKey  // Add this to handle foreign key updates
}) => {
  return (
    <div
      className="absolute bg-neutral-800 rounded-lg shadow-lg border-2 border-neutral-700"
      style={{
        left: position.x,
        top: position.y,
        minWidth: '200px'
      }}
      onMouseDown={onDragStart}
    >
      <div className="p-2 bg-neutral-700 flex justify-between items-center">
        <span className="font-medium text-white">{table.name}</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-neutral-600"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-red-900/50"
            onClick={onDelete}
          >
            <X className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      </div>
      <div className="p-2">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-2 py-1 text-neutral-400">Column</th>
              <th className="text-left px-2 py-1 text-neutral-400">Type</th>
            </tr>
          </thead>
          <tbody>
            {table.columns.map((column, idx) => (
              <tr key={idx} className="border-t border-neutral-700">
                <td className="px-2 py-1">
                  {column.name}
                  {column.primaryKey && '🔑'}
                  {column.foreignKey && '🔗'}
                </td>
                <td className="px-2 py-1 text-neutral-400">
                  {column.type}
                  {column.foreignKey && ` -> ${column.foreignKey.table}.${column.foreignKey.column}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EditTableDialog = ({ table, onSave, allTables, open, onOpenChange }) => {
  const [editedTable, setEditedTable] = useState({ ...table });
  
  // Update editedTable when the input table changes
  useEffect(() => {
    setEditedTable({ ...table });
  }, [table]);
  
  const addColumn = () => {
    setEditedTable(prev => ({
      ...prev,
      columns: [...prev.columns, { name: '', type: 'VARCHAR', primaryKey: false }]
    }));
  };

  const updateColumn = (index, field, value) => {
    setEditedTable(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === index ? { ...col, [field]: value } : col
      )
    }));
  };

  const removeColumn = (index) => {
    setEditedTable(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index)
    }));
  };

  const handleForeignKeySelect = (columnIndex, targetTable, targetColumn) => {
    setEditedTable(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === columnIndex 
          ? {
              ...col,
              foreignKey: targetTable && targetColumn 
                ? { table: targetTable, column: targetColumn }
                : null
            }
          : col
      )
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-800 text-neutral-100">
        <DialogHeader>
          <DialogTitle>Edit Table: {editedTable.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Table Name</label>
            <Input
              value={editedTable.name}
              onChange={(e) => setEditedTable(prev => ({ ...prev, name: e.target.value }))}
              className="bg-neutral-700 border-neutral-600"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Columns</label>
            {editedTable.columns.map((column, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={column.name}
                  onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                  placeholder="Column name"
                  className="bg-neutral-700 border-neutral-600"
                />
                <Select
                  value={column.type}
                  onValueChange={(value) => updateColumn(idx, 'type', value)}
                >
                  <SelectTrigger className="w-32 bg-neutral-700 border-neutral-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-700 border-neutral-600">
                    {Object.entries(DATA_TYPES).map(([category, types]) => (
                      <React.Fragment key={category}>
                        {types.map(type => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={column.primaryKey}
                    onCheckedChange={(checked) => updateColumn(idx, 'primaryKey', checked)}
                    id={`pk-${idx}`}
                  />
                  <label htmlFor={`pk-${idx}`} className="text-sm">PK</label>
                </div>
                {!column.primaryKey && (
                  <Select
                    value={column.foreignKey ? `${column.foreignKey.table}.${column.foreignKey.column}` : 'none'}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        handleForeignKeySelect(idx, null, null);
                      } else {
                        const [table, column] = value.split('.');
                        handleForeignKeySelect(idx, table, column);
                      }
                    }}
                  >
                    <SelectTrigger className="w-48 bg-neutral-700 border-neutral-600">
                      <SelectValue placeholder="Foreign Key" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-700 border-neutral-600">
                      <SelectItem value="none">None</SelectItem>
                      {allTables
                        .filter(t => t.id !== editedTable.id)
                        .map(t => 
                          t.columns
                            .filter(col => col.primaryKey)
                            .map(col => (
                              <SelectItem 
                                key={`${t.name}.${col.name}`} 
                                value={`${t.name}.${col.name}`}
                              >
                                {t.name}.{col.name}
                              </SelectItem>
                            ))
                        )}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeColumn(idx)}
                  className="hover:bg-red-900/50"
                >
                  <X className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={addColumn} variant="outline" className="w-full">
            Add Column
          </Button>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => onOpenChange(false)} variant="ghost">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                onSave(editedTable);
                onOpenChange(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SchemaForge = () => {
  const [tables, setTables] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTable, setDraggedTable] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingTable, setEditingTable] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [relationships, setRelationships] = useState([]);
  
  const canvasRef = useRef(null);

  const addTable = () => {
    const newTable = {
      id: `table-${Date.now()}`,
      name: `Table${tables.length + 1}`,
      columns: [
        { name: 'id', type: 'INT', primaryKey: true },
        { name: 'created_at', type: 'TIMESTAMP' }
      ],
      position: { x: 50, y: 50 }
    };
    setTables([...tables, newTable]);
  };

  const handleTableDragStart = (e, tableId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDraggedTable(tableId);
    setDragOffset({
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    });
    setIsDragging(true);
  };

  const handleTableDrag = (e) => {
    if (isDragging && draggedTable) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom - dragOffset.x;
      const y = (e.clientY - rect.top) / zoom - dragOffset.y;
      
      setTables(tables.map(table =>
        table.id === draggedTable
          ? { ...table, position: { x, y } }
          : table
      ));
    }
  };

  const generateSQL = () => {
    let sql = '';
    tables.forEach(table => {
      sql += `CREATE TABLE ${table.name} (\n`;
      
      // Add columns
      const columnDefinitions = table.columns.map(column => {
        let def = `  ${column.name} ${column.type}`;
        if (column.primaryKey) {
          def += ' PRIMARY KEY';
        }
        if (column.autoIncrement) {
          def += ' AUTO_INCREMENT';
        }
        if (column.notNull) {
          def += ' NOT NULL';
        }
        return def;
      });
      
      sql += columnDefinitions.join(',\n');
      sql += '\n);\n\n';
    });
    
    // Create and trigger download
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'database-schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTableSave = (editedTable) => {
    setTables(prevTables => 
      prevTables.map(table => 
        table.id === editedTable.id ? editedTable : table
      )
    );

    // Update relationships based on foreign keys
    const newRelationships = [];
    editedTable.columns.forEach(column => {
      if (column.foreignKey) {
        newRelationships.push({
          id: `rel-${editedTable.id}-${column.name}`,
          fromTable: editedTable.name,
          fromColumn: column.name,
          toTable: column.foreignKey.table,
          toColumn: column.foreignKey.column
        });
      }
    });

    setRelationships(prevRels => {
      const filteredRels = prevRels.filter(rel => 
        rel.fromTable !== editedTable.name
      );
      return [...filteredRels, ...newRelationships];
    });
  };

  return (
    <div className="w-full h-screen flex flex-col bg-neutral-900 text-neutral-100">
      {editingTable && (
        <EditTableDialog
          table={editingTable}
          onSave={handleTableSave}
          allTables={tables}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
      
      <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-4">
        <h1 className="text-xl font-semibold">SchemaForge</h1>
        <div className="flex space-x-4">
          <Button
            onClick={addTable}
            className="flex items-center bg-neutral-800 hover:bg-neutral-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Table
          </Button>
          <Button
            onClick={generateSQL}
            className="flex items-center bg-neutral-800 hover:bg-neutral-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate SQL
          </Button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden"
           ref={canvasRef}
           onMouseMove={handleTableDrag}
           onMouseUp={() => {
             setIsDragging(false);
             setDraggedTable(null);
           }}>
        <div style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%'
        }}>
          {/* Relationship lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {relationships.map(rel => {
              const fromTable = tables.find(t => t.name === rel.fromTable);
              const toTable = tables.find(t => t.name === rel.toTable);
              if (!fromTable || !toTable) return null;

              const fromX = fromTable.position.x + 200; // Assuming table width is 200
              const fromY = fromTable.position.y + 40; // Middle of the table
              const toX = toTable.position.x;
              const toY = toTable.position.y + 40;

              return (
                <g key={rel.id}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke="#525252"
                    strokeWidth={2 / zoom}
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Optional: Add a small circle at the start of the line */}
                  <circle
                    cx={fromX}
                    cy={fromY}
                    r={4 / zoom}
                    fill="#525252"
                  />
                </g>
              );
            })}
            {/* Define arrowhead marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#525252"
                />
              </marker>
            </defs>
          </svg>

          {tables.map(table => (
            <TableNode
              key={table.id}
              table={table}
              position={table.position}
              onDragStart={(e) => handleTableDragStart(e, table.id)}
              onDelete={() => {
                setTables(tables.filter(t => t.id !== table.id));
              }}
              onEdit={() => {
                setEditingTable(table);
                setIsEditDialogOpen(true);
              }}
              scale={zoom}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchemaForge;