import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Row, Col, Input, Statistic, Pagination, Skeleton, AutoComplete, Select, Tooltip } from 'antd';
import { AlertOutlined, SearchOutlined, FireOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import UpcomingRequirements from './UpcomingRequirements';
import UsageTrends from './UsageTrends';
import OrderTrends from './OrderTrends';

const Dashboard = ({ itemSuggestions }) => {
  const [stockAlertsLow, setStockAlertsLow] = useState([]);
  const [stockAlertsHigh, setStockAlertsHigh] = useState([]);
  const [mostUsedItem, setMostUsedItem] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [quickSearchResult, setQuickSearchResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeCard, setActiveCard] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const quickSearchRef = useRef(null);

  const [sortedInfo, setSortedInfo] = useState({});

  const handleChange = (pagination, filters, sorter) => {
    setSortedInfo(sorter);
  };

  const filterOptions = (inputValue, option) => {
    const lowerCaseInput = inputValue.toLowerCase();
    const itemId = option.value.toLowerCase();
    
    let description = '';
    let material = '';

    if (option.label && typeof option.label === 'object') {
      const labelChildren = option.label.props && option.label.props.children;
      if (Array.isArray(labelChildren)) {
        description = labelChildren[0] && labelChildren[0].props && labelChildren[0].props.children && labelChildren[0].props.children[0] || '';
        material = labelChildren[1] && labelChildren[1].props && labelChildren[1].props.children || '';
      } else if (typeof labelChildren === 'string') {
        description = labelChildren;
      }
    } else if (typeof option.label === 'string') {
      description = option.label;
    }

    return itemId.includes(lowerCaseInput) || 
           description.toLowerCase().includes(lowerCaseInput) || 
           material.toLowerCase().includes(lowerCaseInput);
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchStockAlerts();
      await fetchMostUsedItem();
      setLoading(false);
    };

    fetchData();
  }, []);

  const calculateAvailableStock = (history) => {
    return history.reduce((total, entry) => {
      const match = entry.match(/([+-]\d+)/);
      if (match) {
        return total + parseInt(match[1], 10);
      }
      return total;
    }, 0);
  };

  const fetchStockAlerts = async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/items`);
    const lowStock = response.data.filter(item => calculateAvailableStock(item.history) < item.minlevel);
    const highStock = response.data.filter(item => calculateAvailableStock(item.history) > item.maxlevel);
    setStockAlertsLow(lowStock);
    setStockAlertsHigh(highStock);
    setAllItems(response.data.sort((a, b) => calculateAvailableStock(b.history) - calculateAvailableStock(a.history)));
  };

  const fetchMostUsedItem = async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/items`);
    const itemsWithUsage = response.data.map(item => {
      const totalUsed = item.history.reduce((total, entry) => {
        const match = entry.match(/(-\d+)\s+Used/);
        return match ? total + Math.abs(parseInt(match[1], 10)) : total;
      }, 0);
      return { ...item, totalUsed };
    });
    const sortedItems = itemsWithUsage.sort((a, b) => b.totalUsed - a.totalUsed);
    setMostUsedItem(sortedItems[0]);
    setAllItems(sortedItems);
  };

  const stockAlertColumns = [
    {
      title: "Item ID",
      dataIndex: "itemid",
      key: "itemid",
      sorter: (a, b) => a.itemid.localeCompare(b.itemid),
      sortOrder: sortedInfo.columnKey === 'itemid' && sortedInfo.order,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      sorter: (a, b) => a.description.localeCompare(b.description),
      sortOrder: sortedInfo.columnKey === 'description' && sortedInfo.order,
    },
    {
      title: "Available Stock",
      key: "availableStock",
      sorter: (a, b) => calculateAvailableStock(a.history) - calculateAvailableStock(b.history),
      sortOrder: sortedInfo.columnKey === 'availableStock' && sortedInfo.order,
      render: (_, record) => calculateAvailableStock(record.history),
    },
    {
      title: "Limit",
      key: "limit",
      sorter: (a, b) => {
        const limitA = calculateAvailableStock(a.history) < a.minlevel ? a.minlevel : a.maxlevel;
        const limitB = calculateAvailableStock(b.history) < b.minlevel ? b.minlevel : b.maxlevel;
        return limitA - limitB;
      },
      sortOrder: sortedInfo.columnKey === 'limit' && sortedInfo.order,
      render: (_, record) => calculateAvailableStock(record.history) < record.minlevel ? record.minlevel : record.maxlevel,
    },
  ];

  const mostUsedColumns = [
    {
      title: "Item ID",
      dataIndex: "itemid",
      key: "itemid",
      sorter: (a, b) => a.itemid.localeCompare(b.itemid),
      sortOrder: sortedInfo.columnKey === 'itemid' && sortedInfo.order,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      sorter: (a, b) => a.description.localeCompare(b.description),
      sortOrder: sortedInfo.columnKey === 'description' && sortedInfo.order,
    },
    {
      title: "Total Used",
      dataIndex: "totalUsed",
      key: "totalUsed",
      sorter: (a, b) => a.totalUsed - b.totalUsed,
      sortOrder: sortedInfo.columnKey === 'totalUsed' && sortedInfo.order,
    },
  ];

  const renderTooltip = (record) => (
    <div>
      <p className="tooltip-label">Material: <span className="tooltip-value">{record.material}</span></p>
      <p className="tooltip-label">Comment: <span className="tooltip-value">{record.comment || 'No comment available'}</span></p>
    </div>
  );

  const renderPaginatedTable = (data, columns, visible) => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '20px', marginBottom: '40px', overflow: 'hidden' }}
          >
            <Table
              dataSource={currentItems}
              columns={columns.map(col => ({
                ...col,
                render: (text, record) => (
                  <Tooltip title={renderTooltip(record)} placement="topLeft" overlayStyle={{ maxWidth: '300px' }}>
                    <span>{col.render ? col.render(text, record) : text}</span>
                  </Tooltip>
                ),
              }))}
              rowKey="_id"
              pagination={false}
              onChange={handleChange}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <Select
                value={itemsPerPage}
                onChange={(value) => setItemsPerPage(value)}
                options={[10, 20, 50, 100].map(size => ({ value: size, label: `${size}` }))}
                style={{ width: '100px' }}
              />
              <Pagination
                current={currentPage}
                total={data.length}
                pageSize={itemsPerPage}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const handleQuickSearch = (value) => {
    setSearchTerm(value);
    setIsSearching(value.length > 0);
    if (value) {
      const result = allItems.find(item =>
        item.itemid.toLowerCase() === value.toLowerCase() ||
        item.description.toLowerCase().includes(value.toLowerCase())
      );
      setQuickSearchResult(result);
    } else {
      setQuickSearchResult(null);
    }
  };

  const handleCardClick = (type) => {
    if (type === 'quickStock') {
      setActiveCard(activeCard === type ? null : type);
      if (quickSearchRef.current) {
        quickSearchRef.current.focus();
      }
    } else {
      setActiveCard(activeCard === type ? null : type);
    }
  };

  const cardVariants = {
    active: {
      scale: 1.05,
      boxShadow: '0px 0px 15px rgba(0, 0, 0, 0.2)',
      borderRadius: '8px'
    },
    inactive: {
      scale: 1,
      boxShadow: 'none',
      borderRadius: '8px'
    }
  };

  const quickStockColumns = stockAlertColumns.filter(column => column.key !== 'totalUsed');

  return (
    <div className="dashboard" style={{ marginRight: '30px' }}>
      <Row gutter={16}>
        <Col span={6}>
          <motion.div
            className="dashboard-card"
            variants={cardVariants}
            animate={activeCard === 'low' ? 'active' : 'inactive'}
            whileHover="active"
            whileTap="active"
            style={{ height: '100%' }}
          >
            <Card
              title={<span><AlertOutlined style={{ color: 'red' }} /> Low Stocks </span>}
              bordered={true}
              onClick={() => handleCardClick('low')}
              hoverable
              style={{ backgroundColor: activeCard === 'low' ? '#fff0f0' : 'white', height: '100%' }}
            >
              {loading ? (
                <Skeleton active>
                  <Skeleton.Input style={{ width: 200 }} active size="small" />
                  <Skeleton.Button style={{ width: 100 }} active size="small" />
                </Skeleton>
              ) : (
                <Statistic value={stockAlertsLow.length} valueStyle={{ color: '#cf1322' }} />
              )}
            </Card>
          </motion.div>
        </Col>
        <Col span={6}>
          <motion.div
            className="dashboard-card"
            variants={cardVariants}
            animate={activeCard === 'high' ? 'active' : 'inactive'}
            whileHover="active"
            whileTap="active"
            style={{ height: '100%' }}
          >
            <Card
              title={<span><AlertOutlined style={{ color: 'green' }} /> High Stocks </span>}
              bordered={true}
              onClick={() => handleCardClick('high')}
              hoverable
              style={{ backgroundColor: activeCard === 'high' ? '#f0fff0' : 'white', height: '100%' }}
            >
              {loading ? (
                <Skeleton active>
                  <Skeleton.Input style={{ width: 200 }} active size="small" />
                  <Skeleton.Button style={{ width: 100 }} active size="small" />
                </Skeleton>
              ) : (
                <Statistic value={stockAlertsHigh.length} valueStyle={{ color: '#3f8600' }} />
              )}
            </Card>
          </motion.div>
        </Col>
        <Col span={6}>
          <motion.div
            className="dashboard-card"
            variants={cardVariants}
            animate={activeCard === 'mostUsed' ? 'active' : 'inactive'}
            whileHover="active"
            whileTap="active"
            style={{ height: '100%' }}
          >
            <Card
              title={<span><FireOutlined style={{ color: 'orange' }} /> Most Used Item</span>}
              bordered={false}
              onClick={() => handleCardClick('mostUsed')}
              hoverable
              style={{ backgroundColor: activeCard === 'mostUsed' ? '#fff5e6' : 'white', height: '100%' }}
            >
              {loading ? (
                <Skeleton active>
                  <Skeleton.Input style={{ width: 200 }} active size="small" />
                  <Skeleton.Button style={{ width: 100 }} active size="small" />
                </Skeleton>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{mostUsedItem?.description}</span>
                  <Statistic
                    value={mostUsedItem?.totalUsed}
                    suffix="units"
                  />
                </div>
              )}
            </Card>
          </motion.div>
        </Col>
        <Col span={6}>
          <motion.div
            className="dashboard-card"
            variants={cardVariants}
            animate={activeCard === 'quickStock' ? 'active' : 'inactive'}
            whileHover="active"
            whileTap="active"
            style={{ height: '100%' }}
          >
            <Card
              title={
                <motion.div
                  initial={false}
                  animate={isSearching ? { height: 'auto' } : { height: 0 }}
                >
                  <AutoComplete
                    style={{ width: '100%' }}
                    options={allItems.map(item => ({
                      value: item.itemid,
                      label: (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{`${item.itemid} - ${item.description}`}</span>
                          <span style={{ fontStyle: 'italic', textAlign: 'right' }}>{` ${item.material}`}</span>
                        </div>
                      )
                    }))}
                    onSelect={(value, option) => handleQuickSearch(value)}
                    onChange={(value) => handleQuickSearch(value)}
                    value={searchTerm}
                    filterOption={filterOptions}
                  >
                    <Input
                      placeholder="Enter Item ID or Description"
                      suffix={<SearchOutlined />}
                      ref={quickSearchRef}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </AutoComplete>
                </motion.div>
              }
              extra={
                <motion.div
                  initial={false}
                  animate={isSearching ? { opacity: 0, height: 0 } : { opacity: 1, height: 'auto' }}
                >
                  Quick Stock Check
                </motion.div>
              }
              bordered={false}
              onClick={() => handleCardClick('quickStock')}
              hoverable
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'filter 0.3s ease'
              }}
            >
              <motion.div
                initial={false}
                animate={isSearching ? { opacity: 0, height: 0 } : { opacity: 1, height: 'auto' }}
              >
                <AutoComplete
                  style={{ width: '100%' }}
                  options={allItems.map(item => ({
                    value: item.itemid,
                    label: (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{`${item.itemid} - ${item.description}`}</span>
                        <span style={{ fontStyle: 'italic', textAlign: 'right' }}>{` ${item.material}`}</span>
                      </div>
                    )
                  }))}
                  onSelect={(value, option) => handleQuickSearch(value)}
                  onChange={(value) => handleQuickSearch(value)}
                  value={searchTerm}
                  filterOption={filterOptions}
                >
                  <Input
                    placeholder="Enter Item ID or Description"
                    suffix={<SearchOutlined />}
                    ref={quickSearchRef}
                    onClick={(e) => e.stopPropagation()}
                  />
                </AutoComplete>
              </motion.div>
              {quickSearchResult && (
                <Statistic
                  title={`${quickSearchResult.itemid} - ${quickSearchResult.description}`}
                  value={calculateAvailableStock(quickSearchResult.history)}
                  suffix="units"
                />
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>

      <div style={{ marginTop: '20px', position: 'relative' }}>
        {renderPaginatedTable(stockAlertsLow.sort((a, b) => (calculateAvailableStock(b.history) - b.minlevel) - (calculateAvailableStock(a.history) - a.minlevel)), stockAlertColumns, activeCard === 'low')}
        {renderPaginatedTable(stockAlertsHigh.sort((a, b) => (calculateAvailableStock(b.history) - b.maxlevel) - (calculateAvailableStock(a.history) - a.maxlevel)), stockAlertColumns, activeCard === 'high')}
        {renderPaginatedTable(allItems.sort((a, b) => b.totalUsed - a.totalUsed), mostUsedColumns, activeCard === 'mostUsed')}
        {renderPaginatedTable(allItems.sort((a, b) => calculateAvailableStock(b.history) - calculateAvailableStock(a.history)), quickStockColumns, activeCard === 'quickStock')}
      </div>

      <Row gutter={16}>
        <Col span={24}>
          <UpcomingRequirements
            loading={loading}
            itemSuggestions={itemSuggestions}
            calculateAvailableStock={calculateAvailableStock}
          />
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <UsageTrends
            loading={loading}
            itemSuggestions={itemSuggestions}
            mostUsedItem={mostUsedItem}
          />
        </Col>
        <Col span={12}>
          <OrderTrends
            loading={loading}
            itemSuggestions={itemSuggestions}
            mostUsedItem={mostUsedItem}
          />
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;