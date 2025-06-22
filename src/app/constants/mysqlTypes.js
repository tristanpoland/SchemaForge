// constants/mysqlTypes.js
export const MYSQL_TYPES = {
  'Numeric': [
    'TINYINT',
    'SMALLINT', 
    'MEDIUMINT',
    'INT',
    'BIGINT',
    'DECIMAL',
    'FLOAT',
    'DOUBLE',
    'BIT'
  ],
  'String': [
    'CHAR',
    'VARCHAR',
    'BINARY',
    'VARBINARY',
    'TINYTEXT',
    'TEXT',
    'MEDIUMTEXT',
    'LONGTEXT',
    'TINYBLOB',
    'BLOB',
    'MEDIUMBLOB',
    'LONGBLOB'
  ],
  'Date/Time': [
    'DATE',
    'TIME',
    'DATETIME',
    'TIMESTAMP',
    'YEAR'
  ],
  'JSON': [
    'JSON'
  ],
  'Spatial': [
    'GEOMETRY',
    'POINT',
    'LINESTRING',
    'POLYGON',
    'MULTIPOINT',
    'MULTILINESTRING',
    'MULTIPOLYGON',
    'GEOMETRYCOLLECTION'
  ]
};