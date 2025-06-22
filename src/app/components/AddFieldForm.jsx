"use client";

// components/AddFieldForm.jsx
import React, { useState } from 'react';
import { MYSQL_TYPES } from '../constants/mysqlTypes';

const AddFieldForm = React.memo(({ onAdd, onCancel, allTables, currentTableId, existingFields }) => {
  const [fieldData, setFieldData] = useState({
    name: '',
    type: 'VARCHAR',
    length: '',
    nullable: true,
    primaryKey: false,
    unique: false,
    autoIncrement: false,
    foreignKey: false,
    referencedTable: null,
    referencedField: null,
    defaultValue: ''
  });

  const handleSubmit = () => {
    if (fieldData.name.trim()) {
      // Check if making this a primary key
      let finalFieldData = { ...fieldData };
      
      if (finalFieldData.primaryKey) {
        // Ensure primary key constraints
        finalFieldData.nullable = false;
        finalFieldData.unique = true;
      }

      onAdd(finalFieldData);
      
      // Reset form
      setFieldData({
        name: '',
        type: 'VARCHAR',
        length: '',
        nullable: true,
        primaryKey: false,
        unique: false,
        autoIncrement: false,
        foreignKey: false,
        referencedTable: null,
        referencedField: null,
        defaultValue: ''
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const getReferenceTables = () => {
    return allTables.filter(table => table.id !== currentTableId);
  };

  const getPrimaryKeyFields = (tableId) => {
    const table = allTables.find(t => t.id === tableId);
    return table ? table.data.fields.filter(f => f.primaryKey) : [];
  };

  const hasPrimaryKey = existingFields.some(field => field.primaryKey);

  const handlePrimaryKeyChange = (checked) => {
    setFieldData({
      ...fieldData,
      primaryKey: checked,
      nullable: checked ? false : fieldData.nullable,
      unique: checked ? true : fieldData.unique
    });
  };

  const needsLength = ['VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT', 'DOUBLE', 'BINARY', 'VARBINARY'].includes(fieldData.type);
  const canAutoIncrement = ['TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'BIGINT'].includes(fieldData.type);

  return (
    <div className="border-2 border-blue-600 rounded p-3 mt-2 bg-blue-950/20">
      <div className="space-y-3">
        <input
          value={fieldData.name}
          onChange={(e) => setFieldData({...fieldData, name: e.target.value})}
          onKeyPress={handleKeyPress}
          className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
          placeholder="Field name"
          autoFocus
        />
        
        <div className="flex gap-2">
          <select
            value={fieldData.type}
            onChange={(e) => setFieldData({
              ...fieldData, 
              type: e.target.value,
              length: '',
              autoIncrement: canAutoIncrement ? fieldData.autoIncrement : false
            })}
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
        </div>

        {/* Length/Precision */}
        {needsLength && (
          <input
            type="text"
            value={fieldData.length}
            onChange={(e) => setFieldData({...fieldData, length: e.target.value})}
            placeholder={fieldData.type === 'DECIMAL' ? 'precision,scale (e.g., 10,2)' : 'length'}
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
          />
        )}

        {/* Foreign Key Section */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={fieldData.foreignKey}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setFieldData({
                  ...fieldData, 
                  foreignKey: isChecked,
                  referencedTable: isChecked ? fieldData.referencedTable : null,
                  referencedField: isChecked ? fieldData.referencedField : null
                });
              }}
              className="rounded"
            />
            Foreign Key
          </label>
          
          {fieldData.foreignKey && (
            <div className="space-y-2 ml-4">
              <select
                value={fieldData.referencedTable || ''}
                onChange={(e) => {
                  setFieldData({
                    ...fieldData, 
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
              
              {fieldData.referencedTable && (
                <select
                  value={fieldData.referencedField || ''}
                  onChange={(e) => setFieldData({...fieldData, referencedField: e.target.value})}
                  className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-700 text-white"
                >
                  <option value="">Select Field</option>
                  {getPrimaryKeyFields(fieldData.referencedTable).map(field => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Field Properties */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-1 text-gray-300">
            <input
              type="checkbox"
              checked={fieldData.primaryKey}
              onChange={(e) => handlePrimaryKeyChange(e.target.checked)}
              disabled={hasPrimaryKey}
              className="rounded"
            />
            Primary Key {hasPrimaryKey && '(one exists)'}
          </label>
          <label className="flex items-center gap-1 text-gray-300">
            <input
              type="checkbox"
              checked={fieldData.nullable}
              onChange={(e) => setFieldData({...fieldData, nullable: e.target.checked})}
              disabled={fieldData.primaryKey}
              className="rounded"
            />
            Nullable
          </label>
          <label className="flex items-center gap-1 text-gray-300">
            <input
              type="checkbox"
              checked={fieldData.unique}
              onChange={(e) => setFieldData({...fieldData, unique: e.target.checked})}
              className="rounded"
            />
            Unique
          </label>
          <label className="flex items-center gap-1 text-gray-300">
            <input
              type="checkbox"
              checked={fieldData.autoIncrement}
              onChange={(e) => setFieldData({...fieldData, autoIncrement: e.target.checked})}
              disabled={!canAutoIncrement}
              className="rounded"
            />
            Auto Inc {!canAutoIncrement && '(numeric only)'}
          </label>
        </div>

        {/* Default Value */}
        <input
          type="text"
          value={fieldData.defaultValue}
          onChange={(e) => setFieldData({...fieldData, defaultValue: e.target.value})}
          placeholder="Default value (optional)"
          className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
        />

        <div className="flex gap-2">
          <button 
            onClick={handleSubmit} 
            className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Add Field
          </button>
          <button 
            onClick={onCancel} 
            className="px-3 py-1 bg-gray-600 text-gray-200 rounded text-sm hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

AddFieldForm.displayName = 'AddFieldForm';

export default AddFieldForm;