import React, { useEffect, useState } from 'react';
import { Card, Select, Button, Table, Row, Col, Pagination, Skeleton } from 'antd';
import axios from 'axios';
import moment from 'moment';
import '../Dashboard.css';

const { Option } = Select;

const UpcomingRequirements = ({ loading, itemSuggestions, calculateAvailableStock }) => {
  const [requirements, setRequirements] = useState([]);
  const [filteredRequirements, setFilteredRequirements] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showLowStock, setShowLowStock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchRequirements = async () => {
      const response = await axios.get('http://localhost:4000/requirements');
      setRequirements(response.data);
      setFilteredRequirements(response.data);
    };
    fetchRequirements();
  }, []);

  const aggregateRequirements = (requirements) => {
    const aggregated = {};

    requirements.forEach(req => {
      const neededByDate = moment(req.neededBy).isBefore(moment()) ? null : moment(req.neededBy);
      if (neededByDate) {
        req.items.forEach(item => {
          if (!aggregated[item.itemId]) {
            const foundItem = itemSuggestions.find(s => s.itemid === item.itemId);
            aggregated[item.itemId] = {
              description: item.description,
              quantityNeeded: 0,
              neededBy: neededByDate,
              jobs: new Set(),
              availableStock: calculateAvailableStock(foundItem?.history || []),
            };
          }
          aggregated[item.itemId].quantityNeeded += item.quantityNeeded;
          aggregated[item.itemId].jobs.add(req.jobNumber);
          aggregated[item.itemId].neededBy = moment.min(aggregated[item.itemId].neededBy, neededByDate);
        });
      }
    });

    return Object.entries(aggregated).map(([itemId, data]) => ({
      itemId,
      description: data.description,
      quantityNeeded: data.quantityNeeded,
      neededBy: data.neededBy.format('YYYY-MM-DD'),
      jobs: Array.from(data.jobs).join(', '),
      availableStock: data.availableStock,
    }));
  };

  const handleItemSelect = (value) => {
    setSelectedItems(value);
  };

  const toggleLowStock = () => {
    setShowLowStock(!showLowStock);
  };

  const columns = [
    { title: 'Item ID', dataIndex: 'itemId', key: 'itemId' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Quantity Required', dataIndex: 'quantityNeeded', key: 'quantityNeeded' },
    { title: 'Available Stock', dataIndex: 'availableStock', key: 'availableStock' },
    { title: 'Earliest Required Date', dataIndex: 'neededBy', key: 'neededBy' },
    { title: 'Jobs', dataIndex: 'jobs', key: 'jobs' },
  ];

  const aggregatedData = aggregateRequirements(filteredRequirements);
  const dataSource = aggregatedData.filter(item => {
    const stockDifference = item.availableStock - item.quantityNeeded;
    const isLowStock = showLowStock && stockDifference < 0;
    const isSelected = selectedItems.length === 0 || selectedItems.includes(item.itemId);
    return (!showLowStock || isLowStock) && isSelected;
  });

  const paginatedData = dataSource.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return <Skeleton active />;
  }

  return (
    <Card title="Upcoming Requirements" style={{ marginBottom: '16px' }}>
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={19}>
          <Select
            mode="multiple"
            placeholder="Select items"
            value={selectedItems}
            onChange={handleItemSelect}
            style={{ width: '100%' }}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {itemSuggestions.map(item => (
              <Option key={item.itemid} value={item.itemid}>
                {`${item.itemid} - ${item.description}`}
              </Option>
            ))}
          </Select>
        </Col>
        <Col span={5}>
          <Button onClick={toggleLowStock} style={{ width: '100%' }}>
            {showLowStock ? 'Show All' : 'Filter Low Stock Items'}
          </Button>
        </Col>
      </Row>
      <Table
        dataSource={paginatedData}
        columns={columns}
        rowClassName={record => {
          const item = itemSuggestions.find(s => s.itemid === record.itemId);
          const availableStock = calculateAvailableStock(item?.history || []);
          return availableStock < record.quantityNeeded ? 'highlight' : '';
        }}
        pagination={false}
      />
      <Pagination
        current={currentPage}
        pageSize={itemsPerPage}
        total={dataSource.length}
        onChange={(page) => setCurrentPage(page)}
        style={{ marginTop: '16px', textAlign: 'right' }}
      />
    </Card>
  );
};

export default UpcomingRequirements;