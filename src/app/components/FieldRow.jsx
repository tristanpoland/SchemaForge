"use client";

// components/FieldRow.jsx
import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Key, ExternalLink, Edit3, Save, X, Trash2 } from 'lucide-react';
import { MYSQL_TYPES } from '../constants/mysqlTypes';

const FieldRow = React.memo(({ field, onUpdate, onDelete, isEditing, tableId, allTables, fieldIndex, totalFields }) => {
  const [localField, setLocalField] = useState(field);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  const handleSave = () => {
    onUpdate(localField);
    setEditing(false);
  };

  const handlePrimaryKeyChange = (checked) => {
    if (checked) {
      // Ensure only one primary key per table
      setLocalField({
        ...localField, 
        primaryKey: true,
        nullable: false, // Primary keys can't be null
        unique: true // Primary keys are unique
      });
    } else {
      setLocalField({...localField, primaryKey: false});
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      // Numeric
      'TINYINT': 'bg-blue-900 text-blue-200',
      'SMALLINT': 'bg-blue-900 text-blue-200',
      'MEDIUMINT': 'bg-blue-900 text-blue-200',
      'INT': 'bg-blue-900 text-blue-200',
      'BIGINT': 'bg-blue-900 text-blue-200',
      'DECIMAL': 'bg-purple-900 text-purple-200',
      'FLOAT': 'bg-purple-900 text-purple-200',
      'DOUBLE': 'bg-purple-900 text-purple-200',
      'BIT': 'bg-indigo-900 text-indigo-200',
      
      // String
      'CHAR': 'bg-green-900 text-green-200',
      'VARCHAR': 'bg-green-900 text-green-200',
      'TEXT': 'bg-green-900 text-green-200',
      'TINYTEXT': 'bg-green-900 text-green-200',
      'MEDIUMTEXT': 'bg-green-900 text-green-200',
      'LONGTEXT': 'bg-green-900 text-green-200',
      'BINARY': 'bg-green-900 text-green-200',
      'VARBINARY': 'bg-green-900 text-green-200',
      'TINYBLOB': 'bg-green-900 text-green-200',
      'BLOB': 'bg-green-900 text-green-200',
      'MEDIUMBLOB': 'bg-green-900 text-green-200',
      'LONGBLOB': 'bg-green-900 text-green-200',
      
      // Date/Time
      'DATE': 'bg-yellow-900 text-yellow-200',
      'TIME': 'bg-yellow-900 text-yellow-200',
      'DATETIME': 'bg-yellow-900 text-yellow-200',
      'TIMESTAMP': 'bg-yellow-900 text-yellow-200',
      'YEAR': 'bg-yellow-900 text-yellow-200',
      
      // Others
      'JSON': 'bg-orange-900 text-orange-200',
      'GEOMETRY': 'bg-pink-900 text-pink-200',
      'POINT': 'bg-pink-900 text-pink-200',
      'LINESTRING': 'bg-pink-900 text-pink-200',
      'POLYGON': 'bg-pink-900 text-pink-200',
      'MULTIPOINT': 'bg-pink-900 text-pink-200',
      'MULTILINESTRING': 'bg-pink-900 text-pink-200',
      'MULTIPOLYGON': 'bg-pink-900 text-pink-200'
    };
    return colors[type] || 'bg-gray-700 text-gray-200';
  };

  const getReferenceTables = () => {
    return allTables.filter(table => table.id !== tableId);
  };

  const getPrimaryKeyFields = (tableId) => {
    const table = allTables.find(t => t.id === tableId);
    return table ? table.data.fields.filter(f => f.primaryKey) : [];
  };

  const handleStyle = {
    width: 10,
    height: 10,
    border: '2px solid #374151'
  };

  return (
    <div className="border-b border-gray-600 py-2 last:border-b-0 relative">
      {/* Connection Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id={`${tableId}-${field.id}-source`}
        style={{
          ...handleStyle,
          right: -6,
          backgroundColor: field.foreignKey ? '#3b82f6' : '#6b7280',
          opacity: field.foreignKey ? 1 : 0.4
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={`${tableId}-${field.id}-target`}
        style={{
          ...handleStyle,
          left: -6,
          backgroundColor: field.primaryKey ? '#eab308' : '#6b7280',
          opacity: field.primaryKey ? 1 : 0.4
        }}
      />

      {editing ? (
        <div className="space-y-3 pr-4 pl-2">
          <input
            value={localField.name}
            onChange={(e) => setLocalField({...localField, name: e.target.value})}
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
            placeholder="Field name"
          />
          
          <div className="flex gap-2">
            <select
              value={localField.type}
              onChange={(e) => setLocalField({...localField, type: e.target.value})}
              className="flex-1 px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
            >
              {Object.entries(MYSQL_TYPES).map(([category, types]) => (
                <optgroup key={category} label={category}>
                  {types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="flex gap-1">
              <button onClick={handleSave} className="p-1 text-green-400 hover:bg-green-900/50 rounded">
                <Save size={12} />
              </button>
              <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:bg-gray-700 rounded">
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Length/Precision */}
          {(['VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT', 'DOUBLE', 'BINARY', 'VARBINARY'].includes(localField.type)) && (
            <input
              type="text"
              value={localField.length || ''}
              onChange={(e) => setLocalField({...localField, length: e.target.value})}
              placeholder={localField.type === 'DECIMAL' ? 'precision,scale (e.g., 10,2)' : 'length'}
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
            />
          )}

          {/* Foreign Key Settings */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={localField.foreignKey || false}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setLocalField({
                    ...localField, 
                    foreignKey: isChecked,
                    referencedTable: isChecked ? localField.referencedTable : null,
                    referencedField: isChecked ? localField.referencedField : null
                  });
                  
                  // Remove visual connection if unchecking foreign key
                  if (!isChecked && allTables.length > 0) {
                    const tableNode = allTables.find(t => t.id === tableId);
                    if (tableNode && tableNode.data.onRemoveConnection) {
                      tableNode.data.onRemoveConnection(tableId, field.id);
                    }
                  }
                }}
                className="rounded"
              />
              Foreign Key
            </label>
            
            {localField.foreignKey && (
              <div className="space-y-2 ml-4">
                <select
                  value={localField.referencedTable || ''}
                  onChange={(e) => {
                    setLocalField({
                      ...localField, 
                      referencedTable: e.target.value,
                      referencedField: null
                    });
                  }}
                  className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-700 text-white"
                >
                  <option value="">Select Table</option>
                  {getReferenceTables().map(table => (
                    <option key={table.id} value={table.id}>{table.data.tableName}</option>
                  ))}
                </select>
                
                {localField.referencedTable && (
                  <select
                    value={localField.referencedField || ''}
                    onChange={(e) => {
                      const selectedFieldId = e.target.value;
                      if (selectedFieldId) {
                        // Get the target field for validation
                        const targetTable = allTables.find(t => t.id === localField.referencedTable);
                        const targetField = targetTable?.data.fields.find(f => f.id.toString() === selectedFieldId);
                        
                        if (targetField && allTables.length > 0) {
                          const currentTable = allTables.find(t => t.id === tableId);
                          const validateFunc = currentTable?.data.validateFieldTypes;
                          
                          if (validateFunc) {
                            const validation = validateFunc(localField, targetField);
                            if (!validation.valid) {
                              alert(`Cannot create foreign key:\n${validation.message}`);
                              return;
                            }
                          }
                        }
                      }
                      
                      setLocalField({...localField, referencedField: selectedFieldId});
                    }}
                    className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-700 text-white"
                  >
                    <option value="">Select Field</option>
                    {getPrimaryKeyFields(localField.referencedTable).map(field => (
                      <option key={field.id} value={field.id}>{field.name} ({field.type})</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-1 text-gray-300">
              <input
                type="checkbox"
                checked={localField.primaryKey}
                onChange={(e) => handlePrimaryKeyChange(e.target.checked)}
                className="rounded"
              />
              Primary Key
            </label>
            <label className="flex items-center gap-1 text-gray-300">
              <input
                type="checkbox"
                checked={localField.nullable}
                onChange={(e) => setLocalField({...localField, nullable: e.target.checked})}
                disabled={localField.primaryKey}
                className="rounded"
              />
              Nullable
            </label>
            <label className="flex items-center gap-1 text-gray-300">
              <input
                type="checkbox"
                checked={localField.unique}
                onChange={(e) => setLocalField({...localField, unique: e.target.checked})}
                className="rounded"
              />
              Unique
            </label>
            <label className="flex items-center gap-1 text-gray-300">
              <input
                type="checkbox"
                checked={localField.autoIncrement || false}
                onChange={(e) => setLocalField({...localField, autoIncrement: e.target.checked})}
                disabled={!['TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'BIGINT'].includes(localField.type)}
                className="rounded"
              />
              Auto Inc
            </label>
          </div>

          {/* Default Value */}
          <input
            type="text"
            value={localField.defaultValue || ''}
            onChange={(e) => setLocalField({...localField, defaultValue: e.target.value})}
            placeholder="Default value"
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between pr-4 pl-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-white">{field.name}</span>
              {field.primaryKey && <Key size={12} className="text-yellow-400" />}
              {field.foreignKey && <ExternalLink size={12} className="text-blue-400" />}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                {field.type}{field.length ? `(${field.length})` : ''}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1 flex gap-2">
              {!field.nullable && <span>NOT NULL</span>}
              {field.unique && <span>UNIQUE</span>}
              {field.autoIncrement && <span>AUTO_INCREMENT</span>}
              {field.defaultValue && <span>DEFAULT: {field.defaultValue}</span>}
            </div>
            {field.foreignKey && field.referencedTable && (
              <div className="text-xs text-blue-400 mt-1">
                FK → {allTables.find(t => t.id === field.referencedTable)?.data.tableName || 'Unknown'}
              </div>
            )}
          </div>
          {isEditing && (
            <div className="flex gap-1">
              <button onClick={() => setEditing(true)} className="p-1 text-blue-400 hover:bg-blue-900/50 rounded">
                <Edit3 size={12} />
              </button>
              <button onClick={onDelete} className="p-1 text-red-400 hover:bg-red-900/50 rounded">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

FieldRow.displayName = 'FieldRow';

export default FieldRow;