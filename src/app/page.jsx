"use client"
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, FileText, Move, ZoomIn, ZoomOut, X, Edit2, Download, Eye } from 'lucide-react';

// Expanded data types with size support
const DATA_TYPES = {
  numeric: ['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'],
  text: ['VARCHAR', 'TEXT', 'CHAR', 'LONGTEXT'],
  date: ['DATE', 'TIMESTAMP', 'TIME', 'DATETIME'],
  binary: ['BLOB', 'BINARY', 'VARBINARY'],
  boolean: ['BOOLEAN'],
  json: ['JSON', 'JSONB']
};

// Data types that support length/precision/scale
const SIZE_SUPPORTED_TYPES = [
  'VARCHAR', 'CHAR', 'DECIMAL', 'BINARY', 'VARBINARY', 'BIT'
];

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/Dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { Checkbox } from "@/components/ui/Checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip"
import { Label } from "@/components/ui/Label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"

const parseSQL = (sql, dialect = 'standard') => {
  const tables = [];
  try {
    // Remove any schema references (e.g., 'public.')
    sql = sql.replace(/public\./g, '');
    
    // First, split into individual CREATE TABLE statements
    const tableStatements = sql.split(/CREATE TABLE/).filter(s => s.trim());
    
    for (const tableStatement of tableStatements) {
      // Extract table name and body
      const tableMatch = tableStatement.match(/\s*(\w+)\s*\(([\s\S]*?)\);/);
      if (!tableMatch) continue;
      
      const tableName = tableMatch[1];
      const tableBody = tableMatch[2];
      
      const table = {
        id: `table-${Date.now()}-${Math.random()}`,
        name: tableName,
        columns: [],
        position: { x: 50 + Math.random() * 200, y: 50 + Math.random() * 200 }
      };
      
      // Split into individual column/constraint definitions
      const definitions = tableBody
        .split(',')
        .map(d => d.trim())
        .filter(d => d && !d.startsWith('INDEX')); // Skip INDEX statements
      
      // Process column definitions first to populate table columns
      for (const def of definitions) {
        // Skip if it's clearly a constraint definition
        if (/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|INDEX)/i.test(def)) {
          continue;
        }
        
        // Parse regular column definition with potential size
        // Updated regex to capture size in type definition
        const colMatch = def.match(/^(\w+)\s+([\w]+)(?:\(([^)]+)\))?(?:\s+(.*))?$/);
        if (!colMatch) continue;
        
        const [_, columnName, baseType, sizeStr, constraints] = colMatch;
        
        // Create the type string with size if present
        const columnType = sizeStr ? `${baseType}(${sizeStr})` : baseType;
        
        // Skip if this looks like a constraint definition
        if (['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'INDEX'].includes(columnName.toUpperCase())) {
          continue;
        }
        
        const column = {
          name: columnName,
          type: baseType.toUpperCase(),
          size: sizeStr || '',
          primaryKey: false,
          notNull: false,
          unique: false,
          autoIncrement: false,
          defaultValue: null
        };
        
        // Parse constraints if present
        if (constraints) {
          column.primaryKey = /PRIMARY KEY/i.test(constraints);
          column.notNull = /NOT NULL/i.test(constraints);
          column.unique = /UNIQUE/i.test(constraints);
          column.autoIncrement = /AUTO_INCREMENT|AUTOINCREMENT|SERIAL/i.test(constraints);
          
          // Extract default value if present
          const defaultMatch = constraints.match(/DEFAULT\s+([^,\s]+)/i);
          if (defaultMatch) {
            column.defaultValue = defaultMatch[1];
          }
        }
        
        table.columns.push(column);
      }
      
      // Process foreign key constraints after all columns are parsed
      for (const def of definitions) {
        // Check if it's a FOREIGN KEY constraint
        const fkMatch = def.match(/FOREIGN KEY\s*\((\w+)\)\s*REFERENCES\s*(?:[\w.]+\.)?(\w+)\s*\((\w+)\)/i);
        if (fkMatch) {
          const [_, columnName, referenceTable, referenceColumn] = fkMatch;
          const column = table.columns.find(col => col.name === columnName);
          if (column) {
            column.foreignKey = {
              table: referenceTable,
              column: referenceColumn
            };
          }
        }
      }
      
      // Only add table if it has columns
      if (table.columns.length > 0) {
        tables.push(table);
      }
    }
    
    return tables;
  } catch (error) {
    console.error('Error parsing SQL:', error);
    throw new Error(`Failed to parse SQL: ${error.message}`);
  }
};

// Component to draw relationship lines
const RelationshipLines = ({ tables, relationships, zoom }) => {
  if (!tables.length || !relationships.length) return null;
  
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      {relationships.map(rel => {
        const fromTable = tables.find(t => t.name === rel.fromTable);
        const toTable = tables.find(t => t.name === rel.toTable);
        
        if (!fromTable || !toTable) return null;
        
        // Calculate position based on average height of tables
        const fromTableHeight = 40 + (fromTable.columns.length * 30);
        const toTableHeight = 40 + (toTable.columns.length * 30);
        
        // Find column positions - approximating based on column index
        const fromColumnIndex = fromTable.columns.findIndex(c => c.name === rel.fromColumn);
        const toColumnIndex = toTable.columns.findIndex(c => c.name === rel.toColumn);
        
        // Calculate y position based on column position
        const fromY = fromTable.position.y + 50 + (fromColumnIndex * 30);
        const toY = toTable.position.y + 50 + (toColumnIndex * 30);
        
        // Outgoing from right side of source table, incoming to left side of target table
        const fromX = fromTable.position.x + 200;
        const toX = toTable.position.x;
        
        // Calculate control points for the curve
        const controlPointOffset = 50;
        const midX = (fromX + toX) / 2;
        
        return (
          <g key={rel.id}>
            {/* Curved path for the relationship */}
            <path
              d={`M ${fromX} ${fromY} 
                  C ${fromX + controlPointOffset} ${fromY}, 
                    ${toX - controlPointOffset} ${toY}, 
                    ${toX} ${toY}`}
              stroke="#6366f1"
              strokeWidth={2 / zoom}
              fill="none"
              markerEnd="url(#arrowhead)"
              strokeDasharray={rel.optional ? "5,5" : "none"}
            />
            
            {/* Origin indicator */}
            <circle cx={fromX} cy={fromY} r={4 / zoom} fill="#6366f1" />
            
            {/* Relationship label - positioned at midpoint */}
            <text
              x={midX}
              y={(fromY + toY) / 2 - 10}
              fill="#a5b4fc"
              fontSize={12 / zoom}
              textAnchor="middle"
              dominantBaseline="middle"
              filter="url(#textBackground)"
            >
              {`${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}`}
            </text>
          </g>
        );
      })}
      
      {/* Definitions for markers and filters */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
        </marker>
        
        {/* Filter to create a background for text labels */}
        <filter id="textBackground" x="-20%" y="-50%" width="140%" height="200%">
          <feFlood floodColor="rgb(23,23,23)" result="bg" />
          <feComposite in="SourceGraphic" in2="bg" operator="over" />
        </filter>
      </defs>
    </svg>
  );
};

const TableNode = ({ 
  table, 
  position, 
  onDragStart, 
  onDrag, 
  onDragEnd,
  onEdit,
  onDelete,
  scale,
  highlightedRelationships = [],
  onHighlightRelationship
}) => {
  // Helper to determine if column is part of highlighted relationship
  const isHighlighted = (columnName) => {
    return highlightedRelationships.some(rel => 
      (rel.fromTable === table.name && rel.fromColumn === columnName) ||
      (rel.toTable === table.name && rel.toColumn === columnName)
    );
  };

  return (
    <div
      className="absolute bg-neutral-800 rounded-lg shadow-lg border-2 border-neutral-700 overflow-hidden max-h-96"
      style={{
        left: position.x,
        top: position.y,
        width: '220px'
      }}
      onMouseDown={onDragStart}
    >
      <div className="p-2 bg-neutral-700 flex justify-between items-center sticky top-0 z-10">
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
      <div className="p-2 overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-neutral-600">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-neutral-800">
            <tr>
              <th className="text-left px-2 py-1 text-neutral-400">Column</th>
              <th className="text-left px-2 py-1 text-neutral-400">Type</th>
            </tr>
          </thead>
          <tbody>
            {table.columns.map((column, idx) => (
              <tr 
                key={idx} 
                className={`border-t border-neutral-700 ${isHighlighted(column.name) ? 'bg-indigo-900/30' : ''}`}
                onMouseEnter={() => {
                  if (column.foreignKey || column.primaryKey) {
                    onHighlightRelationship(table.name, column.name);
                  }
                }}
                onMouseLeave={() => onHighlightRelationship(null, null)}
              >
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1">
                    {column.name}
                    {column.primaryKey && <span title="Primary Key" className="text-yellow-400">🔑</span>}
                    {column.foreignKey && <span title="Foreign Key" className="text-blue-400">🔗</span>}
                    {column.notNull && <span title="NOT NULL" className="text-red-400">*</span>}
                    {column.unique && !column.primaryKey && <span title="Unique" className="text-green-400">★</span>}
                    {column.autoIncrement && <span title="Auto Increment" className="text-purple-400">↑</span>}
                  </div>
                </td>
                <td className="px-2 py-1 text-neutral-400 truncate max-w-[100px]" title={column.type + (column.size ? `(${column.size})` : '')}>
                  {column.type}{column.size ? `(${column.size})` : ''}
                  {column.defaultValue && <span className="text-xs text-neutral-500 block">Default: {column.defaultValue}</span>}
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
  const [activeTab, setActiveTab] = useState("columns");
  
  useEffect(() => {
    setEditedTable({ ...table });
  }, [table]);
  
  const addColumn = () => {
    setEditedTable(prev => ({
      ...prev,
      columns: [...prev.columns, { 
        name: '', 
        type: 'VARCHAR', 
        size: '255',
        primaryKey: false, 
        notNull: false,
        unique: false,
        autoIncrement: false,
        defaultValue: null
      }]
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

  // Function to determine if size input should be shown
  const shouldShowSizeInput = (type) => {
    return SIZE_SUPPORTED_TYPES.includes(type);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-800 text-neutral-100 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Table: {editedTable.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="columns" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-neutral-700">
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="table-options">Table Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value="columns" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Table Name</label>
              <Input
                value={editedTable.name}
                onChange={(e) => setEditedTable(prev => ({ ...prev, name: e.target.value }))}
                className="bg-neutral-700 border-neutral-600"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Columns</label>
                <Button 
                  onClick={addColumn} 
                  variant="outline" 
                  size="sm"
                  className="bg-neutral-700 border-neutral-600"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Column
                </Button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto border border-neutral-700 rounded-md p-2">
                {editedTable.columns.map((column, idx) => (
                  <div key={idx} className="space-y-2 pb-2 border-b border-neutral-700">
                    <div className="flex gap-2 items-center">
                      <Input
                        value={column.name}
                        onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                        placeholder="Column name"
                        className="bg-neutral-700 border-neutral-600 flex-1"
                      />
                      
                      <div className="flex items-center gap-1 min-w-[220px]">
                        <Select
                          value={column.type}
                          onValueChange={(value) => {
                            updateColumn(idx, 'type', value);
                            // Set default size for types that need it
                            if (shouldShowSizeInput(value) && !column.size) {
                              if (value === 'VARCHAR') updateColumn(idx, 'size', '255');
                              else if (value === 'CHAR') updateColumn(idx, 'size', '50');
                              else if (value === 'DECIMAL') updateColumn(idx, 'size', '10,2');
                            }
                          }}
                        >
                          <SelectTrigger className="w-24 bg-neutral-700 border-neutral-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-700 border-neutral-600 max-h-56">
                            {Object.entries(DATA_TYPES).map(([category, types]) => (
                              <React.Fragment key={category}>
                                <div className="px-2 py-1 text-xs text-neutral-400 uppercase">
                                  {category}
                                </div>
                                {types.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </React.Fragment>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {shouldShowSizeInput(column.type) && (
                          <Input
                            value={column.size || ''}
                            onChange={(e) => updateColumn(idx, 'size', e.target.value)}
                            placeholder="Size"
                            className="bg-neutral-700 border-neutral-600 w-20"
                          />
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeColumn(idx)}
                        className="hover:bg-red-900/50"
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={column.primaryKey}
                          onCheckedChange={(checked) => {
                            updateColumn(idx, 'primaryKey', checked);
                            // Primary keys are always NOT NULL
                            if (checked) updateColumn(idx, 'notNull', true);
                          }}
                          id={`pk-${idx}`}
                        />
                        <label htmlFor={`pk-${idx}`} className="text-sm">PK</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={column.notNull}
                          onCheckedChange={(checked) => updateColumn(idx, 'notNull', checked)}
                          id={`nn-${idx}`}
                        />
                        <label htmlFor={`nn-${idx}`} className="text-sm">NOT NULL</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={column.unique}
                          onCheckedChange={(checked) => updateColumn(idx, 'unique', checked)}
                          id={`unq-${idx}`}
                        />
                        <label htmlFor={`unq-${idx}`} className="text-sm">UNIQUE</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={column.autoIncrement}
                          onCheckedChange={(checked) => updateColumn(idx, 'autoIncrement', checked)}
                          id={`ai-${idx}`}
                        />
                        <label htmlFor={`ai-${idx}`} className="text-sm">AUTO_INCREMENT</label>
                      </div>
                      
                      <div className="flex items-center space-x-2 w-full mt-1">
                        <label className="text-sm min-w-12">DEFAULT:</label>
                        <Input
                          value={column.defaultValue || ''}
                          onChange={(e) => updateColumn(idx, 'defaultValue', e.target.value || null)}
                          placeholder="Default value"
                          className="bg-neutral-700 border-neutral-600 h-7 text-sm"
                        />
                      </div>
                    </div>
                    
                    {!column.primaryKey && (
                      <div className="flex items-center space-x-2 w-full">
                        <label className="text-sm min-w-12">FK REF:</label>
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
                          <SelectTrigger className="w-full bg-neutral-700 border-neutral-600">
                            <SelectValue placeholder="Select foreign key reference" />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-700 border-neutral-600 max-h-56">
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="table-options" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="table-comment">Table Comment</Label>
                <Input
                  id="table-comment"
                  placeholder="Table description"
                  className="bg-neutral-700 border-neutral-600"
                  value={editedTable.comment || ''}
                  onChange={(e) => setEditedTable(prev => ({ ...prev, comment: e.target.value }))}
                />
              </div>
              
              {/* Additional table options can be added here, such as:
              - Storage engine (for MySQL)
              - Character set
              - Collation
              - etc. */}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SQLPreviewDialog = ({ sql, open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-800 text-neutral-100 max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>SQL Preview</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh]">
          <pre className="bg-neutral-900 p-4 rounded-md overflow-x-auto text-sm">
            <code className="text-green-400">
              {sql}
            </code>
          </pre>
        </div>
        <DialogFooter>
          <Button 
            onClick={() => {
              const blob = new Blob([sql], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'schema.sql';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download SQL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SUPPORTED_DIALECTS = {
  'standard': 'Standard SQL',
  'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
  'cockroachdb': 'CockroachDB',
  'sqlite': 'SQLite',
  'mssql': 'MS SQL Server',
  'oracle': 'Oracle'
};

// This code fixes the SchemaForge component by adding the missing JSX return statement

const SchemaForge = () => {
  const [tables, setTables] = useState([]);
  const [selectedDialect, setSelectedDialect] = useState('standard');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [editingTable, setEditingTable] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSQLPreviewOpen, setIsSQLPreviewOpen] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [relationships, setRelationships] = useState([]);
  const [highlightedRelationships, setHighlightedRelationships] = useState([]);
  const [gridSize, setGridSize] = useState(20); // Grid size for snap-to-grid
  const [snapToGrid, setSnapToGrid] = useState(false);
  
  // Track active dragging
  const [activeDrag, setActiveDrag] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const snapToGridRef = useRef(snapToGrid);
  const gridSizeRef = useRef(gridSize);
  
  // Keep refs in sync with state
  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
    snapToGridRef.current = snapToGrid;
    gridSizeRef.current = gridSize;
  }, [zoom, pan, snapToGrid, gridSize]);

  // Update relationships when tables change
  useEffect(() => {
    updateRelationships();
  }, [tables]);

  // Define the generateSQL function
  const generateSQL = (tables, dialect = 'standard') => {
    let sql = '';
    sql += '-- Generated by SchemaForge\n';
    sql += `-- Dialect: ${SUPPORTED_DIALECTS[dialect] || dialect}\n`;
    sql += `-- Generated at: ${new Date().toISOString()}\n\n`;
  
    // Sort tables to handle dependencies
    const sortedTables = [...tables].sort((a, b) => {
      const aHasForeignKeys = a.columns.some(col => col.foreignKey);
      const bHasForeignKeys = b.columns.some(col => col.foreignKey);
      
      // Tables without foreign keys come first
      return aHasForeignKeys && !bHasForeignKeys ? 1 : 
             !aHasForeignKeys && bHasForeignKeys ? -1 : 0;
    });
  
    // Helper to format auto increment based on dialect
    const getAutoIncrementSyntax = (dialect) => {
      switch(dialect.toLowerCase()) {
        case 'mysql':
          return 'AUTO_INCREMENT';
        case 'postgresql':
        case 'cockroachdb':
          return 'SERIAL';
        case 'sqlite':
          return 'AUTOINCREMENT';
        case 'mssql':
          return 'IDENTITY(1,1)';
        case 'oracle':
          return ''; // Oracle uses sequences
        default:
          return 'AUTO_INCREMENT';
      }
    };
    
    // Special handling for each dialect
    const dialectSpecificSyntax = {
      tableStart: (tableName) => {
        switch(dialect.toLowerCase()) {
          case 'postgresql':
          case 'cockroachdb':
            return `CREATE TABLE "${tableName}" (\n`;
          case 'mssql':
            return `CREATE TABLE [${tableName}] (\n`;
          case 'oracle':
            return `CREATE TABLE "${tableName}" (\n`;
          default:
            return `CREATE TABLE ${tableName} (\n`;
        }
      },
      
      columnType: (column) => {
        // Handle dialect-specific type mappings
        let type = column.type;
        
        if (column.size && SIZE_SUPPORTED_TYPES.includes(column.type)) {
          return `${type}(${column.size})`;
        }
        
        // Handle auto-increment primary keys
        if (column.primaryKey && column.autoIncrement) {
          switch(dialect.toLowerCase()) {
            case 'postgresql':
              return column.type === 'INT' ? 'SERIAL' : 
                     column.type === 'BIGINT' ? 'BIGSERIAL' : type;
            case 'cockroachdb':
              return type;
            default:
              return type;
          }
        }
        
        return type;
      }
    };
  
    sortedTables.forEach(table => {
      // Add table comment if present
      if (table.comment) {
        sql += `-- ${table.comment}\n`;
      }
      
      sql += dialectSpecificSyntax.tableStart(table.name);
      
      // Column definitions
      const columnDefs = table.columns.map(column => {
        let def = `  ${column.name} ${dialectSpecificSyntax.columnType(column)}`;
        
        // Add constraints
        if (column.primaryKey) {
          def += ' PRIMARY KEY';
        }
        
        if (column.notNull && !column.primaryKey) {
          def += ' NOT NULL';
        }
        
        if (column.unique && !column.primaryKey) {
          def += ' UNIQUE';
        }
        
        if (column.autoIncrement && !column.type.includes('SERIAL')) {
          def += ` ${getAutoIncrementSyntax(dialect)}`;
        }
        
        if (column.defaultValue) {
          def += ` DEFAULT ${column.defaultValue}`;
        }
        
        return def;
      });
  
      // Foreign key constraints
      const foreignKeys = table.columns
        .filter(column => column.foreignKey)
        .map(column => 
          `  FOREIGN KEY (${column.name}) REFERENCES ${column.foreignKey.table}(${column.foreignKey.column})`
        );
  
      sql += [...columnDefs, ...foreignKeys].join(',\n');
      sql += '\n);\n\n';
      
      // Add indexes if needed based on dialect
      if (dialect.toLowerCase() === 'postgresql' || dialect.toLowerCase() === 'mysql') {
        table.columns.forEach(column => {
          if (column.foreignKey) {
            sql += `CREATE INDEX idx_${table.name}_${column.name} ON ${table.name}(${column.name});\n`;
          }
        });
        if (table.columns.some(col => col.foreignKey)) {
          sql += '\n';
        }
      }
    });
  
    return sql;
  };

  // Build relationships based on foreign keys
  const updateRelationships = () => {
    const newRelationships = [];
    
    tables.forEach(table => {
      table.columns.forEach(column => {
        if (column.foreignKey) {
          const toTable = tables.find(t => t.name === column.foreignKey.table);
          if (toTable) {
            newRelationships.push({
              id: `rel-${table.id}-${column.name}-${toTable.id}`,
              fromTable: table.name,
              fromColumn: column.name,
              toTable: column.foreignKey.table,
              toColumn: column.foreignKey.column,
              optional: !column.notNull
            });
          }
        }
      });
    });
    
    setRelationships(newRelationships);
  };

  const addTable = () => {
    const newTable = {
      id: `table-${Date.now()}`,
      name: `Table${tables.length + 1}`,
      columns: [
        { name: 'id', type: 'INT', primaryKey: true, notNull: true, autoIncrement: true },
        { name: 'created_at', type: 'TIMESTAMP', notNull: false, defaultValue: 'CURRENT_TIMESTAMP' }
      ],
      position: { 
        x: 50 + (tables.length * 30) % 300, 
        y: 50 + Math.floor(tables.length / 3) * 100 
      }
    };
    setTables([...tables, newTable]);
  };

  // Updated drag handlers for continuous positioning
  const handleMouseDown = (e, tableId) => {
    if (e.button !== 0) return; // Only handle left mouse button
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Find the table
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    // Set the active drag
    setActiveDrag(tableId);
    setDragStartPos({
      mouseX,
      mouseY,
      tableX: table.position.x,
      tableY: table.position.y
    });
  };
  
  const handleMouseMove = (e) => {
    // Handle panning
    if (isPanning) {
      const dx = (e.clientX - lastPanPoint.x) / zoom;
      const dy = (e.clientY - lastPanPoint.y) / zoom;
      setPan(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Handle table dragging with continuous updates
    if (activeDrag) {
      const deltaX = (e.clientX - dragStartPos.mouseX) / zoomRef.current;
      const deltaY = (e.clientY - dragStartPos.mouseY) / zoomRef.current;
      
      let newX = dragStartPos.tableX + deltaX;
      let newY = dragStartPos.tableY + deltaY;
      
      // Apply snap to grid if enabled
      if (snapToGridRef.current) {
        newX = Math.round(newX / gridSizeRef.current) * gridSizeRef.current;
        newY = Math.round(newY / gridSizeRef.current) * gridSizeRef.current;
      }
      
      // Update the table position in real-time
      setTables(prevTables =>
        prevTables.map(t =>
          t.id === activeDrag
            ? { ...t, position: { x: newX, y: newY } }
            : t
        )
      );
    }
  };
  
  const handleMouseUp = () => {
    // End both dragging and panning
    setActiveDrag(null);
    setIsPanning(false);
  };
  
  // Handle pan with middle mouse button
  const handleCanvasMouseDown = (e) => {
    // Middle mouse button (button 1) or Space + left click
    if (e.button === 1 || (e.button === 0 && e.getModifierState('Space'))) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleCanvasWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.1), 2);
      
      // Zoom centered on mouse position
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;
      
      // Adjust pan to keep mouse position fixed
      const newPan = {
        x: pan.x - (mouseX * (newZoom - zoom)),
        y: pan.y - (mouseY * (newZoom - zoom))
      };
      
      setZoom(newZoom);
      setPan(newPan);
    }
  };
  
  // Handle table updates from the edit dialog
  const handleTableSave = (editedTable) => {
    setTables(prevTables => 
      prevTables.map(table => 
        table.id === editedTable.id ? editedTable : table
      )
    );
  };
  
  // Prepare and show SQL preview
  const handleShowSQLPreview = () => {
    try {
      const sql = generateSQL(tables, selectedDialect);
      setGeneratedSQL(sql);
      setIsSQLPreviewOpen(true);
    } catch (error) {
      alert(`Error generating SQL: ${error.message}`);
    }
  };
  
  // Handle direct SQL export
  const handleExportSQL = () => {
    try {
      const sql = generateSQL(tables, selectedDialect);
      const blob = new Blob([sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schema.sql';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error exporting SQL: ${error.message}`);
    }
  };
  
  // Handle SQL file import
  const handleImportSQL = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const sql = event.target?.result;
        if (typeof sql === 'string') {
          try {
            const importedTables = parseSQL(sql, selectedDialect);
            if (importedTables.length === 0) {
              alert('No valid tables found in the SQL file. Please check the file format.');
            } else {
              // Arrange tables in a grid layout
              const arrangedTables = importedTables.map((table, index) => ({
                ...table,
                position: {
                  x: 100 + (index % 3) * 250,
                  y: 100 + Math.floor(index / 3) * 300
                }
              }));
              setTables(arrangedTables);
            }
          } catch (error) {
            alert(`Error importing SQL: ${error.message}`);
          }
        }
      };
      reader.readAsText(file);
    }
  };
  
  // Handle highlighting relationships when hovering over a column
  const handleHighlightRelationship = (tableName, columnName) => {
    if (!tableName || !columnName) {
      setHighlightedRelationships([]);
      return;
    }
    
    // Find all relationships involving this table/column
    const relevantRelationships = relationships.filter(rel => 
      (rel.fromTable === tableName && rel.fromColumn === columnName) ||
      (rel.toTable === tableName && rel.toColumn === columnName)
    );
    
    setHighlightedRelationships(relevantRelationships);
  };
  
  // Reset view to center all tables
  const resetView = () => {
    if (tables.length === 0) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      return;
    }
    
    // Find bounding box of all tables
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    tables.forEach(table => {
      minX = Math.min(minX, table.position.x);
      minY = Math.min(minY, table.position.y);
      maxX = Math.max(maxX, table.position.x + 220); // Table width
      maxY = Math.max(maxY, table.position.y + 200); // Approximate table height
    });
    
    // Calculate center of bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate canvas dimensions
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    // Calculate required zoom to fit all tables
    const boxWidth = maxX - minX + 100; // Add margin
    const boxHeight = maxY - minY + 100;
    
    const zoomX = canvasWidth / boxWidth;
    const zoomY = canvasHeight / boxHeight;
    const newZoom = Math.min(Math.min(zoomX, zoomY), 1); // Cap at 1x zoom
    
    // Center the view
    const newPan = {
      x: (canvasWidth / 2 / newZoom) - centerX,
      y: (canvasHeight / 2 / newZoom) - centerY
    };
    
    setPan(newPan);
    setZoom(newZoom);
  };

  // Memoize the transformation container to prevent unnecessary re-renders
  const transformContainer = useMemo(() => {
    return {
      transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
      transformOrigin: '0 0',
      width: '100%',
      height: '100%'
    };
  }, [zoom, pan.x, pan.y]);

  // Define a draggable table node that uses mouse events for continuous updates
  const DraggableTableNode = ({ 
    table, 
    position, 
    onDelete,
    onEdit,
    scale,
    highlightedRelationships = [],
    onHighlightRelationship
  }) => {
    const isActive = activeDrag === table.id;
    
    // Helper to determine if column is part of highlighted relationship
    const isHighlighted = (columnName) => {
      return highlightedRelationships.some(rel => 
        (rel.fromTable === table.name && rel.fromColumn === columnName) ||
        (rel.toTable === table.name && rel.toColumn === columnName)
      );
    };

    return (
      <div
        className={`absolute bg-neutral-800 rounded-lg shadow-lg border-2 cursor-move
                  ${isActive ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-neutral-700'} 
                  overflow-hidden max-h-96`}
        style={{
          left: position.x,
          top: position.y,
          width: '220px',
          zIndex: isActive ? 10 : 1
        }}
        onMouseDown={(e) => {
          // Don't initiate drag if we're clicking on a button
          if (e.target.closest('button')) {
            return;
          }
          handleMouseDown(e, table.id);
        }}
      >
        <div className="p-2 bg-neutral-700 flex justify-between items-center sticky top-0 z-10">
          <span className="font-medium text-white">{table.name}</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-neutral-600"
              onClick={() => onEdit()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-red-900/50"
              onClick={() => onDelete()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        </div>
        <div className="p-2 overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-neutral-600">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-neutral-800">
              <tr>
                <th className="text-left px-2 py-1 text-neutral-400">Column</th>
                <th className="text-left px-2 py-1 text-neutral-400">Type</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((column, idx) => (
                <tr 
                  key={idx} 
                  className={`border-t border-neutral-700 ${isHighlighted(column.name) ? 'bg-indigo-900/30' : ''}`}
                  onMouseEnter={() => {
                    if (column.foreignKey || column.primaryKey) {
                      onHighlightRelationship(table.name, column.name);
                    }
                  }}
                  onMouseLeave={() => onHighlightRelationship(null, null)}
                >
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      {column.name}
                      {column.primaryKey && <span title="Primary Key" className="text-yellow-400">🔑</span>}
                      {column.foreignKey && <span title="Foreign Key" className="text-blue-400">🔗</span>}
                      {column.notNull && <span title="NOT NULL" className="text-red-400">*</span>}
                      {column.unique && !column.primaryKey && <span title="Unique" className="text-green-400">★</span>}
                      {column.autoIncrement && <span title="Auto Increment" className="text-purple-400">↑</span>}
                    </div>
                  </td>
                  <td className="px-2 py-1 text-neutral-400 truncate max-w-[100px]" title={column.type + (column.size ? `(${column.size})` : '')}>
                    {column.type}{column.size ? `(${column.size})` : ''}
                    {column.defaultValue && <span className="text-xs text-neutral-500 block">Default: {column.defaultValue}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex flex-col bg-neutral-900 text-neutral-100">
      {/* Dialogs */}
      {editingTable && (
        <EditTableDialog
          table={editingTable}
          onSave={handleTableSave}
          allTables={tables}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
      
      <SQLPreviewDialog
        sql={generatedSQL}
        open={isSQLPreviewOpen}
        onOpenChange={setIsSQLPreviewOpen}
      />
      
      {/* Header toolbar */}
      <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0">
        <h1 className="text-xl font-semibold">SchemaForge</h1>
        <div className="flex items-center space-x-2">
          {/* View controls */}
          <div className="flex items-center space-x-1 mr-2 bg-neutral-800 rounded-md p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setZoom(prev => Math.max(prev * 0.9, 0.1))}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-neutral-700"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <span className="text-sm w-14 text-center">{Math.round(zoom * 100)}%</span>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setZoom(prev => Math.min(prev * 1.1, 2))}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-neutral-700"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={resetView}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-neutral-700"
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="flex items-center space-x-2 ml-1">
              <Checkbox
                id="snap-grid"
                checked={snapToGrid}
                onCheckedChange={setSnapToGrid}
                className="h-4 w-4"
              />
              <label htmlFor="snap-grid" className="text-xs cursor-pointer">Snap to Grid</label>
            </div>
          </div>
          
          {/* Table actions */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={addTable}
                  className="bg-neutral-800 hover:bg-neutral-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Table
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add a new table to the schema</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* SQL Dialect selector */}
          <div className="flex items-center">
            <Select
              value={selectedDialect}
              onValueChange={setSelectedDialect}
            >
              <SelectTrigger className="w-40 bg-neutral-700 border-neutral-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-700 border-neutral-600 max-h-56">
                {Object.entries(SUPPORTED_DIALECTS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Import/Export buttons */}
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="flex items-center bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-md cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Import SQL
                    <input
                      type="file"
                      accept=".sql"
                      className="hidden"
                      onChange={handleImportSQL}
                    />
                  </label>
                </TooltipTrigger>
                <TooltipContent>Import a SQL schema file</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleShowSQLPreview}
                    className="bg-neutral-800 hover:bg-neutral-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview SQL
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview the generated SQL</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleExportSQL}
                    className="bg-neutral-800 hover:bg-neutral-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export SQL
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export the schema to a SQL file</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Canvas area with continuous drag updates */}
      <div 
        className="flex-1 relative overflow-hidden bg-neutral-950"
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleCanvasWheel}
      >
        {/* Grid background for visualization */}
        {snapToGrid && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(75, 75, 75, 0.3) 1px, transparent 1px)',
              backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
              backgroundPosition: `${pan.x * zoom}px ${pan.y * zoom}px`
            }}
          />
        )}
        
        {/* Transformation container - memoized to prevent frequent re-renders */}
        <div style={transformContainer}>
          {/* Relationship lines with improved visualization */}
          <RelationshipLines 
            tables={tables} 
            relationships={[...relationships, ...highlightedRelationships]} 
            zoom={zoom} 
          />

          {/* Table nodes - now using direct mouse events for continuous updates */}
          {tables.map(table => (
            <DraggableTableNode
              key={table.id}
              table={table}
              position={table.position}
              onDelete={() => {
                // Remove table and its relationships
                setTables(tables.filter(t => t.id !== table.id));
                setRelationships(relationships.filter(
                  rel => rel.fromTable !== table.name && rel.toTable !== table.name
                ));
              }}
              onEdit={() => {
                setEditingTable(table);
                setIsEditDialogOpen(true);
              }}
              scale={zoom}
              allTables={tables}
              highlightedRelationships={highlightedRelationships}
              onHighlightRelationship={handleHighlightRelationship}
            />
          ))}
        </div>
        
        {/* Help info overlay */}
        <div className="absolute bottom-4 left-4 bg-neutral-800/80 backdrop-blur-sm p-2 rounded-md text-xs text-neutral-300">
          <div>
            <span className="font-semibold">Pan:</span> Middle-click drag or Space+drag
          </div>
          <div>
            <span className="font-semibold">Zoom:</span> Ctrl+scroll
          </div>
          <div>
            <span className="font-semibold">Tables:</span> {tables.length} 
            <span className="font-semibold ml-3">Relationships:</span> {relationships.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaForge;