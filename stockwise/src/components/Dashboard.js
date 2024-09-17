import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Row, Col, DatePicker, Select, Input, Statistic, Typography, Pagination, Skeleton, AutoComplete } from 'antd';
import { Line } from "@ant-design/charts";
import { AlertOutlined, SearchOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title } = Typography;

const Dashboard = ({ itemSuggestions }) => {
  const [stockAlertsLow, setStockAlertsLow] = useState([]);
  const [stockAlertsHigh, setStockAlertsHigh] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [mostUsedItem, setMostUsedItem] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [quickSearchResult, setQuickSearchResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeCard, setActiveCard] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const quickSearchRef = useRef(null);

  useEffect(() => {
    fetchStockAlerts();
    fetchRequirements();
    fetchUsageHistory();
    fetchMostUsedItem();
    setLoading(false);
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
    const response = await axios.get("http://localhost:4000/items");
    const lowStock = response.data.filter(item => calculateAvailableStock(item.history) < item.minlevel);
    const highStock = response.data.filter(item => calculateAvailableStock(item.history) > item.maxlevel);
    setStockAlertsLow(lowStock);
    setStockAlertsHigh(highStock);
    setAllItems(response.data);
  };

  const fetchRequirements = async () => {
    const response = await axios.get("http://localhost:4000/requirements");
    const sortedRequirements = response.data.sort((a, b) => moment(a.neededBy).diff(moment(b.neededBy)));
    setRequirements(sortedRequirements);
  };

  const fetchUsageHistory = async () => {
    const response = await axios.get("http://localhost:4000/use-history");
    setUsageHistory(response.data);
    setFilteredHistory(response.data);
  };

  const fetchMostUsedItem = async () => {
    const response = await axios.get("http://localhost:4000/items");
    const itemsWithUsage = response.data.map(item => {
      const totalUsed = item.history.reduce((total, entry) => {
        const match = entry.match(/(-\d+)\s+Used/);
        return match ? total + parseInt(match[1], 10) * -1 : total;
      }, 0);
      return { ...item, totalUsed };
    });
    const sortedItems = itemsWithUsage.sort((a, b) => b.totalUsed - a.totalUsed);
    setMostUsedItem(sortedItems[0]);
  };

  const handleDateChange = (dates) => {
    if (!dates) {
      setFilteredHistory(usageHistory);
    } else {
      const [start, end] = dates;
      const filtered = usageHistory.filter(history => {
        const dateUsed = moment(history.dateUsed);
        return dateUsed.isBetween(start, end, "day", "[]");
      });
      setFilteredHistory(filtered);
    }
  };

  const handleItemSelection = (value) => {
    const filtered = usageHistory.filter(item => value.includes(item.itemId));
    setFilteredHistory(filtered);
  };

  const stockAlertColumns = [
    { title: "Item ID", dataIndex: "itemid", key: "itemid" },
    { title: "Description", dataIndex: "description", key: "description" },
    { title: "Available Stock", render: (_, record) => calculateAvailableStock(record.history), key: "availableStock" },
  ];

  const requirementsColumns = [
    { title: "Job Number", dataIndex: "jobNumber", key: "jobNumber" },
    { title: "Needed By", dataIndex: "neededBy", key: "neededBy", render: (text) => moment(text).format('YYYY-MM-DD') },
    { title: "Items Needed", dataIndex: "items", key: "items", render: items => items.map(item => `${item.description} (${item.quantityNeeded})`).join(", ") }
  ];

  const usageHistoryConfig = {
    data: filteredHistory,
    xField: 'dateUsed',
    yField: 'quantityUsed',
    seriesField: 'itemId',
    xAxis: { type: 'time' },
    slider: { start: 0, end: 1 },
  };

  const handleQuickSearch = (value) => {
    setSearchTerm(value);
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
    if (type === 'quickStock' && quickSearchRef.current) {
      quickSearchRef.current.focus();
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
            style={{ marginTop: '20px', marginBottom: '20px', overflow: 'hidden' }}
          >
            <Table
              dataSource={currentItems}
              columns={columns}
              rowKey="_id"
              pagination={false}
            />
            <Pagination
              current={currentPage}
              total={data.length}
              pageSize={itemsPerPage}
              onChange={(page) => setCurrentPage(page)}
              style={{ marginTop: '16px', textAlign: 'right' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const filterOptions = (inputValue, option) => {
    return option.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1 ||
      option.label.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1;
  };

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
            {loading ? (
              <Skeleton active />
            ) : (
              <Card
                title={<span><AlertOutlined style={{ color: 'red' }} /> Low Stocks </span>}
                bordered={true}
                onClick={() => handleCardClick('low')}
                hoverable
                style={{ backgroundColor: activeCard === 'low' ? '#fff0f0' : 'white', height: '100%' }}
              >
                <Statistic value={stockAlertsLow.length} valueStyle={{ color: '#cf1322' }} />
              </Card>
            )}
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
            {loading ? (
              <Skeleton active />
            ) : (
              <Card
                title={<span><AlertOutlined style={{ color: 'green' }} /> High Stocks </span>}
                bordered={true}
                onClick={() => handleCardClick('high')}
                hoverable
                style={{ backgroundColor: activeCard === 'high' ? '#f0fff0' : 'white', height: '100%' }}
              >
                <Statistic value={stockAlertsHigh.length} valueStyle={{ color: '#3f8600' }} />
              </Card>
            )}
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
            {loading ? (
              <Skeleton active />
            ) : (
              <Card
                title="Most Used Item"
                bordered={false}
                onClick={() => handleCardClick('mostUsed')}
                hoverable
                style={{ backgroundColor: activeCard === 'mostUsed' ? '#f0f0ff' : 'white', height: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{mostUsedItem?.description}</span>
                  <Statistic
                    value={mostUsedItem?.totalUsed}
                    suffix="units"
                  />
                </div>
              </Card>
            )}
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
            {loading ? (
              <Skeleton active />
            ) : (
              <Card
                title="Quick Stock"
                bordered={false}
                onClick={() => handleCardClick('quickStock')}
                hoverable
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <AutoComplete
                  style={{ width: '100%', marginBottom: '10px' }}
                  options={allItems.map(item => ({ value: item.itemid, label: `${item.itemid} - ${item.description}` }))}
                  onSelect={(value, option) => handleQuickSearch(value)}
                  onChange={(value) => setSearchTerm(value)}
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
                {quickSearchResult && (
                  <Statistic
                    title={`${quickSearchResult.itemid} - ${quickSearchResult.description}`}
                    value={calculateAvailableStock(quickSearchResult.history)}
                    suffix="units"
                  />
                )}
              </Card>
            )}
          </motion.div>
        </Col>
      </Row>

      <div style={{ marginTop: '20px', position: 'relative' }}>
        {renderPaginatedTable(stockAlertsLow, stockAlertColumns, activeCard === 'low')}
        {renderPaginatedTable(stockAlertsHigh, stockAlertColumns, activeCard === 'high')}
        {renderPaginatedTable([mostUsedItem].filter(Boolean), [...stockAlertColumns, { title: "Total Used", dataIndex: "totalUsed", key: "totalUsed" }], activeCard === 'mostUsed')}
        {renderPaginatedTable(allItems, [...stockAlertColumns, { title: "Total Used", dataIndex: "totalUsed", key: "totalUsed" }], activeCard === 'quickStock')}
      </div>

      <AnimatePresence>
        {isSearching && quickSearchResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden', marginTop: '20px' }}
          >
            <Card>
              <Statistic
                title={`${quickSearchResult.itemid} - ${quickSearchResult.description}`}
                value={calculateAvailableStock(quickSearchResult.history)}
                suffix="units"
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Row gutter={16}>
        <Col span={24}>
          <div className="dashboard-card">
            {loading ? (
              <Skeleton active />
            ) : (
              <Card title="Upcoming Requirements" bordered={false}>
                <Select
                  mode="multiple"
                  style={{ width: '100%', marginBottom: '16px' }}
                  placeholder="Filter by Items"
                  onChange={handleItemSelection}
                >
                  {itemSuggestions.map((item) => (
                    <Option key={item.itemid} value={item.itemid}>{item.description}</Option>
                  ))}
                </Select>
                <Table dataSource={requirements} columns={requirementsColumns} rowKey="_id" pagination={false} />
              </Card>
            )}
          </div>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={24}>
          <div className="dashboard-card">
            {loading ? (
              <Skeleton active />
            ) : (
              <Card title="Usage Trends" bordered={false}>
                <RangePicker onChange={handleDateChange} style={{ marginBottom: '16px' }} />
                <Line {...usageHistoryConfig} />
              </Card>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;