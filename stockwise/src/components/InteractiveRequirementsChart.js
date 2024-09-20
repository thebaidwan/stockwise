import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, Select, Button } from 'antd';

const { Option } = Select;

const InteractiveRequirementsChart = ({ data }) => {
  const [showAllItems, setShowAllItems] = useState(false);
  const [sortBy, setSortBy] = useState('Shortfall');

  const processedData = data.map(item => ({
    name: item.itemId,
    description: item.description,
    "Quantity Needed": item.quantityNeeded,
    "Available Stock": item.availableStock,
    Shortfall: Math.max(item.quantityNeeded - item.availableStock, 0),
    Surplus: Math.max(item.availableStock - item.quantityNeeded, 0),
    neededBy: item.neededBy
  })).sort((a, b) => b[sortBy] - a[sortBy]);

  const displayedData = showAllItems ? processedData : processedData.slice(0, 10);

  const handleSortChange = (value) => {
    setSortBy(value);
  };

  const toggleShowAll = () => {
    setShowAllItems(!showAllItems);
  };

  const barColors = {
    "Quantity Needed": "#4682B4",
    "Available Stock": "#3CB371",
    Shortfall: "#FF6347"
  };

  return (
    <Card>
      <div style={{ marginBottom: '20px' }}>
        <Select
          defaultValue={sortBy}
          onChange={handleSortChange}
          style={{ width: 200, marginRight: '10px' }}
        >
          <Option value="Shortfall">Sort by Shortfall</Option>
          <Option value="Quantity Needed">Sort by Quantity Needed</Option>
          <Option value="Available Stock">Sort by Available Stock</Option>
        </Select>
        <Button onClick={toggleShowAll}>
          {showAllItems ? 'Show Top 10' : 'Show All Items'}
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={displayedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            cursor={{ fill: 'rgba(74, 144, 226, 0.1)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <Card size="small" style={{ width: 240, padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{data.name} - {data.description}</p>
                    <p style={{ margin: '5px 0' }}>Quantity Needed: <span style={{ color: '#1890ff' }}>{data["Quantity Needed"]}</span></p>
                    <p style={{ margin: '5px 0' }}>Available Stock: <span style={{ color: '#52c41a' }}>{data["Available Stock"]}</span></p>
                    <p style={{ margin: '5px 0' }}>Shortfall: <span style={{ color: '#f5222d' }}>{data.Shortfall}</span></p>
                    <p style={{ margin: '5px 0' }}>Surplus: {data.Surplus}</p>
                    <p style={{ margin: '5px 0' }}>Earliest Needed: {data.neededBy}</p>
                  </Card>
                );
              }
              return null;
            }}
          />
          <Legend iconType="circle" />
          <Bar 
            dataKey="Available Stock" 
            stackId="a" 
            fill={barColors["Available Stock"]}
          />
          <Bar 
            dataKey="Shortfall" 
            stackId="a" 
            fill={barColors.Shortfall}
          />
          <Bar 
            dataKey="Quantity Needed" 
            fill={barColors["Quantity Needed"]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default InteractiveRequirementsChart;