"use client";

// components/TableNode.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { Database, Edit3, Save, Plus } from 'lucide-react';
import FieldRow from './FieldRow';
import AddFieldForm from './AddFieldForm';

const TableNode = React.memo(({ data, selected }) => {
  // Defensive programming - ensure data exists
  const safeData = data || {};
  
  const [isEditing, setIsEditing] = useState(false);
  const [tableName, setTableName] = useState(safeData.tableName || 'New Table');
  const [fields, setFields] = useState(safeData.fields || []);
  const [showAddField, setShowAddField] = useState(false);

  const allTables = safeData.allTables || [];
  const onCreateConnection = safeData.onCreateConnection;
  const onRemoveConnection = safeData.onRemoveConnection;

  // Update local state when data changes
  useEffect(() => {
    setTableName(safeData.tableName || 'New Table');
    setFields(safeData.fields || []);
  }, [safeData.tableName, safeData.fields]);

  const handleSave = useCallback(() => {
    if (safeData.onUpdate && typeof safeData.onUpdate === 'function') {
      safeData.onUpdate({
        tableName,
        fields: [...fields] // Create new array to ensure immutability
      });
    }
    setIsEditing(false);
  }, [safeData, tableName, fields]);

  const addField = useCallback((fieldData) => {
    const newField = {
      id: Date.now() + Math.random(), // Ensure unique ID
      name: fieldData.name,
      type: fieldData.type,
      length: fieldData.length,
      nullable: fieldData.nullable,
      primaryKey: fieldData.primaryKey,
      unique: fieldData.unique,
      autoIncrement: fieldData.autoIncrement,
      foreignKey: fieldData.foreignKey,
      referencedTable: fieldData.referencedTable,
      referencedField: fieldData.referencedField,
      defaultValue: fieldData.defaultValue || ''
    };

    // If this is being set as primary key, remove primary key from other fields
    let updatedFields = [...fields];
    if (newField.primaryKey) {
      updatedFields = updatedFields.map(f => ({ ...f, primaryKey: false }));
    }

    const newFields = [...updatedFields, newField];
    setFields(newFields);
    setShowAddField(false);
    
    // Auto-save the new field
    if (safeData.onUpdate) {
      safeData.onUpdate({
        tableName,
        fields: newFields
      });
    }

    // Create connection if this is a foreign key
    if (newField.foreignKey && newField.referencedTable && newField.referencedField && onCreateConnection) {
      onCreateConnection(safeData.id, newField.id, newField.referencedTable, newField.referencedField);
    }
  }, [fields, tableName, safeData, onCreateConnection]);

  const removeField = useCallback((fieldId) => {
    const newFields = fields.filter(f => f.id !== fieldId);
    setFields(newFields);
    
    // Auto-save after removal
    if (safeData.onUpdate) {
      safeData.onUpdate({
        tableName,
        fields: newFields
      });
    }
  }, [fields, tableName, safeData]);

  const updateField = useCallback((fieldId, updates) => {
    let newFields = fields.map(f => {
      if (f.id === fieldId) {
        const updatedField = { ...f, ...updates };
        
        // If setting as primary key, ensure it's not nullable and remove primary key from others
        if (updates.primaryKey && !f.primaryKey) {
          updatedField.nullable = false;
          updatedField.unique = true;
        }
        
        return updatedField;
      }
      // If another field is being set as primary key, remove primary key from this field
      else if (updates.primaryKey && f.primaryKey) {
        return { ...f, primaryKey: false };
      }
      return f;
    });

    setFields(newFields);
    
    // Auto-save after update
    if (safeData.onUpdate) {
      safeData.onUpdate({
        tableName,
        fields: newFields
      });
    }

    // Handle foreign key connections
    const updatedField = newFields.find(f => f.id === fieldId);
    if (updatedField && updatedField.foreignKey && updatedField.referencedTable && updatedField.referencedField && onCreateConnection) {
      onCreateConnection(safeData.id, fieldId, updatedField.referencedTable, updatedField.referencedField);
    }
  }, [fields, tableName, safeData, onCreateConnection]);

  return (
    <div className={`bg-gray-800 border-2 rounded-lg shadow-lg min-w-80 max-w-96 ${
      selected ? 'border-blue-400' : 'border-gray-600'
    }`}>
      {/* Table Header */}
      <div className="bg-blue-700 text-white p-3 rounded-t-lg flex items-center justify-between">
        {isEditing ? (
          <input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            className="bg-blue-800 text-white px-2 py-1 rounded border-0 outline-none flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            onBlur={handleSave}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Database size={16} />
            <span className="font-semibold">{tableName}</span>
          </div>
        )}
        <div className="flex gap-1 ml-2">
          {isEditing ? (
            <button onClick={handleSave} className="p-1 hover:bg-blue-800 rounded">
              <Save size={14} />
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-blue-800 rounded">
              <Edit3 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Fields List */}
      <div className="p-2 max-h-96 overflow-y-auto">
        {fields.map((field, index) => (
          <FieldRow 
            key={field.id} 
            field={field} 
            onUpdate={(updates) => updateField(field.id, updates)}
            onDelete={() => removeField(field.id)}
            isEditing={isEditing}
            tableId={safeData.id}
            allTables={allTables}
            fieldIndex={index}
            totalFields={fields.length}
          />
        ))}
        
        {showAddField && (
          <AddFieldForm 
            onAdd={addField}
            onCancel={() => setShowAddField(false)}
            allTables={allTables}
            currentTableId={safeData.id}
            existingFields={fields}
          />
        )}
        
        {isEditing && (
          <button 
            onClick={() => setShowAddField(true)}
            className="w-full mt-2 p-2 border-2 border-dashed border-gray-600 text-gray-400 hover:border-blue-400 hover:text-blue-400 rounded transition-colors"
          >
            <Plus size={16} className="inline mr-1" />
            Add Field
          </button>
        )}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';

export default TableNode;