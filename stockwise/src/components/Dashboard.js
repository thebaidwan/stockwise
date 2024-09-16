import React, { useState, useEffect } from 'react';
import { Layout, Row, Col, Card, Statistic, Table, Alert, Progress, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Line, Bar } from '@ant-design/plots';
import axios from 'axios';
import '@fontsource/open-sans';

const { Title } = Typography;

// Sub-components
const StockAlerts = ({ items }) => {
  const lowStockItems = items.filter(item => item.availablestock < item.minlevel);
  const highStockItems = items.filter(item => item.availablestock > item.maxlevel);

  return (
    <Card title="Stock Alerts">
      {lowStockItems.length > 0 && (
        <Alert
          message="Low Stock Alert"
          description={`${lowStockItems.length} items are below minimum stock level.`}
          type="warning"
          showIcon
        />
      )}
      {highStockItems.length > 0 && (
        <Alert
          message="High Stock Alert"
          description={`${highStockItems.length} items are above maximum stock level.`}
          type="info"
          showIcon
        />
      )}
      {lowStockItems.length === 0 && highStockItems.length === 0 && (
        <Alert
          message="Stock Levels Normal"
          description="All items are within their stock level ranges."
          type="success"
          showIcon
        />
      )}
    </Card>
  );
};

const UsageTrends = ({ useHistory }) => {
  const data = useHistory.map(entry => ({
    date: entry.date,
    usage: entry.quantity,
  }));

  const config = {
    data,
    xField: 'date',
    yField: 'usage',
    point: {
      size: 5,
      shape: 'diamond',
    },
    tooltip: {
      showMarkers: false,
    },
    state: {
      active: {
        style: {
          shadowBlur: 4,
          stroke: '#000',
          fill: 'red',
        },
      },
    },
    interactions: [
      {
        type: 'marker-active',
      },
    ],
  };

  return (
    <Card title="Usage Trends">
      <Line {...config} />
    </Card>
  );
};

const TopSellingProducts = ({ orderHistory }) => {
  const productSales = orderHistory.reduce((acc, order) => {
    order.items.forEach(item => {
      if (acc[item.itemid]) {
        acc[item.itemid] += item.quantity;
      } else {
        acc[item.itemid] = item.quantity;
      }
    });
    return acc;
  }, {});

  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([itemid, quantity]) => ({ itemid, quantity }));

  const columns = [
    {
      title: 'Item ID',
      dataIndex: 'itemid',
      key: 'itemid',
    },
    {
      title: 'Quantity Sold',
      dataIndex: 'quantity',
      key: 'quantity',
    },
  ];

  return (
    <Card title="Top Selling Products">
      <Table dataSource={topProducts} columns={columns} pagination={false} />
    </Card>
  );
};

const InventoryTurnover = ({ items, useHistory }) => {
  const calculateTurnover = () => {
    const totalCost = items.reduce((sum, item) => sum + item.availablestock * item.cost, 0);
    const totalUsage = useHistory.reduce((sum, entry) => sum + entry.quantity, 0);
    return totalUsage / totalCost;
  };

  const turnoverRate = calculateTurnover();

  return (
    <Card>
      <Statistic
        title="Inventory Turnover Rate"
        value={turnoverRate.toFixed(2)}
        precision={2}
        valueStyle={{ color: turnoverRate > 1 ? '#3f8600' : '#cf1322' }}
        prefix={turnoverRate > 1 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        suffix="times"
      />
    </Card>
  );
};

const StockLevelChart = ({ items }) => {
  const data = items.map(item => ({
    item: item.itemid,
    stock: item.availablestock,
    min: item.minlevel,
    max: item.maxlevel,
  }));

  const config = {
    data,
    isGroup: true,
    xField: 'item',
    yField: 'stock',
    seriesField: 'type',
    label: {
      position: 'middle',
      layout: [
        {
          type: 'interval-adjust-position',
        },
        {
          type: 'interval-hide-overlap',
        },
        {
          type: 'adjust-color',
        },
      ],
    },
  };

  return (
    <Card title="Stock Levels">
      <Bar {...config} />
    </Card>
  );
};

const RequirementsOverview = ({ requirements }) => {
  const columns = [
    {
      title: 'Item ID',
      dataIndex: 'itemid',
      key: 'itemid',
    },
    {
      title: 'Quantity Required',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
    },
  ];

  return (
    <Card title="Upcoming Requirements">
      <Table dataSource={requirements} columns={columns} pagination={{ pageSize: 5 }} />
    </Card>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const [items, setItems] = useState([]);
  const [useHistory, setUseHistory] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [requirements, setRequirements] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const itemsResponse = await fetch('http://localhost:4000/items');
        const useHistoryResponse = await fetch('http://localhost:4000/use-history');
        const orderHistoryResponse = await fetch('http://localhost:4000/order-history');
        const requirementsResponse = await fetch('http://localhost:4000/requirements');

        const itemsData = await itemsResponse.json();
        const useHistoryData = await useHistoryResponse.json();
        const orderHistoryData = await orderHistoryResponse.json();
        const requirementsData = await requirementsResponse.json();

        setItems(itemsData);
        setUseHistory(useHistoryData);
        setOrderHistory(orderHistoryData);
        setRequirements(requirementsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <Layout style={{ padding: '24px' }}>
      <Title level={2}>Inventory Dashboard</Title>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <StockAlerts items={items} />
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <UsageTrends useHistory={useHistory} />
        </Col>
        <Col span={12}>
          <TopSellingProducts orderHistory={orderHistory} />
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <InventoryTurnover items={items} useHistory={useHistory} />
        </Col>
        <Col span={16}>
          <StockLevelChart items={items} />
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <RequirementsOverview requirements={requirements} />
        </Col>
      </Row>
    </Layout>
  );
};

export default Dashboard;