import React, { useEffect, useState, useRef } from 'react';
import { Empty, Card, Collapse, Input, List, Row, Col, Pagination, Select, Button, Modal, Spin, notification, Tooltip, Form, Popconfirm, Skeleton } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { useItemChange } from './useItemChange';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { useUser } from './UserContext';

const { Panel } = Collapse;
const { Option } = Select;

function SavedOrderHistory({ refresh, itemSuggestions }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [sortOrder, setSortOrder] = useState('desc');
  const [showEditButtons, setShowEditButtons] = useState(false);
  const [activePanels, setActivePanels] = useState([]);
  const { items, setItems, handleInputChange } = useItemChange(itemSuggestions);
  const prevOrdersRef = useRef([]);
  const { currentUser } = useUser();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/order-history`);
      const data = await response.json();
      setOrders(data);
      setFilteredOrders(data);
    } catch (error) {
      notification.error({ message: 'Failed to fetch order history' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [refresh]);

  useEffect(() => {
    if (Array.isArray(orders)) {
      const filtered = orders.filter(order =>
        order && order.poNumber && order.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders([]);
    }
    setCurrentPage(1);
  }, [searchTerm, orders]);

  useEffect(() => {
    const sorted = [...filteredOrders].sort((a, b) => {
      const dateA = a?.dateReceived ? new Date(a.dateReceived) : new Date(0);
      const dateB = b?.dateReceived ? new Date(b.dateReceived) : new Date(0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    setFilteredOrders(sorted);
  }, [sortOrder, orders]);

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => (prevOrder === 'desc' ? 'asc' : 'desc'));
  };

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const handleEdit = (order) => {
    form.setFieldsValue({
      poNumber: order.poNumber,
      dateReceived: order.dateReceived ? new Date(order.dateReceived).toISOString().split('T')[0] : '',
      items: order.items
    });
    setItems(order.items);
    setEditOrder(order);
    setIsEditing(true);
  };

  const handleDeleteOrderHistory = async (id, isFromCard = true) => {
    if (isFromCard) {
      Modal.confirm({
        title: 'Are you sure you want to delete this order from history?',
        onOk: async () => {
          await executeDelete(id);
        },
      });
    } else {
      await executeDelete(id);
    }
  };

  const executeDelete = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/order-history/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setOrders(prevOrders => prevOrders.filter(order => order._id !== id));
        setFilteredOrders(prevOrders => prevOrders.filter(order => order._id !== id));
        notification.success({ message: 'Order deleted successfully' });
      } else {
        notification.error({ message: 'Failed to delete order' });
      }
    } catch (error) {
      notification.error({ message: 'Failed to delete order' });
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editOrder) {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/order-history/${editOrder._id}`, {
          method: 'PUT',
          body: JSON.stringify(values),
          headers: { 'Content-Type': 'application/json', 'current-user': currentUser }
        });
        const updatedOrder = await response.json();
        setOrders(prevOrders => prevOrders.map(order => order._id === updatedOrder._id ? updatedOrder : order));
        setFilteredOrders(prevOrders => prevOrders.map(order => order._id === updatedOrder._id ? updatedOrder : order));
      }
      notification.success({ message: 'Order saved successfully' });
      setIsEditing(false);
      setEditOrder(null);
    } catch (error) {
      notification.error({ message: 'Failed to save order' });
    } finally {
      setLoading(false);
    }
  };

  const handleModalCancel = () => {
    setIsEditing(false);
    setEditOrder(null);
  };

  const handlePanelChange = (key) => {
    setActivePanels(key);
  };

  const paginatedOrders = Array.isArray(filteredOrders)
    ? filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : [];

  return (
    <>
      <Card
        title="Order History"
        style={{ marginTop: '20px', border: 'none' }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input.Search
              placeholder="Search by PO Number"
              style={{ width: 300, marginRight: '16px' }}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="search-items-field"
              disabled={loading}
            />
            <Button
              icon={sortOrder === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
              onClick={toggleSortOrder}
              style={{ marginRight: '16px' }}
              disabled={loading}
            >
              Sort by Date
            </Button>
            <Button.Group>
              <Button
                type={showEditButtons ? 'primary' : 'default'}
                onClick={() => setShowEditButtons(!showEditButtons)}
                style={{
                  backgroundColor: showEditButtons ? '#52c41a' : undefined,
                  borderColor: showEditButtons ? '#52c41a' : undefined,
                  color: showEditButtons ? '#fff' : undefined,
                }}
                disabled={loading}
              >
                {showEditButtons ? 'Save' : 'Edit'}
              </Button>
            </Button.Group>
          </div>
        }
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <Spin spinning={loading} style={{ paddingTop: '20px' }}>
            <div style={{ display: loading ? 'none' : 'block' }}>
              {!loading && paginatedOrders.length > 0 ? (
                <TransitionGroup>
                  {paginatedOrders.map(order => (
                    <CSSTransition
                      key={order._id.$oid}
                      timeout={500}
                      classNames="page-change"
                    >
                      <Collapse
                        activeKey={activePanels}
                        onChange={handlePanelChange}
                        bordered={true}
                        style={{ marginBottom: '10px' }}
                      >
                        <Panel
                          header={
                            <Row>
                              <Col span={12}><strong>PO Number:</strong> {order.poNumber || 'N/A'}</Col>
                              <Col span={12}><strong>Date Received:</strong> {order.dateReceived ? new Date(order.dateReceived).toLocaleDateString() : 'N/A'}</Col>
                            </Row>
                          }
                          key={order._id.$oid}
                          extra={
                            showEditButtons && (
                              <>
                                <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(order)} />
                                <Tooltip title="Delete">
                                  <Button type="link" icon={<DeleteOutlined style={{ color: 'red' }} />} onClick={() => handleDeleteOrderHistory(order._id)} />
                                </Tooltip>
                              </>
                            )
                          }
                        >
                          <List
                            itemLayout="horizontal"
                            dataSource={order.items || []}
                            renderItem={item => (
                              <List.Item>
                                <List.Item.Meta
                                  title={`Item ID: ${item.itemId || 'N/A'}`}
                                  description={item.description || 'N/A'}
                                />
                                <div>Quantity Received: {item.quantityReceived || 'N/A'}</div>
                              </List.Item>
                            )}
                          />
                        </Panel>
                      </Collapse>
                    </CSSTransition>
                  ))}
                </TransitionGroup>
              ) : <Empty />}
            </div>
          </Spin>
        )}

        <Row justify="space-between" align="left" style={{ marginTop: '16px' }}>
          <Col>
            <Select
              defaultValue={10}
              style={{ width: 100, marginRight: '16px' }}
              onChange={value => setPageSize(value)}
            >
              <Option value={10}>10</Option>
              <Option value={20}>20</Option>
              <Option value={50}>50</Option>
              <Option value={100}>100</Option>
            </Select>
          </Col>
          <Col>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={filteredOrders.length}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
          </Col>
        </Row>
      </Card>

      <Modal
        title="Edit Order"
        open={isEditing}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        footer={[
          <Row justify="space-between" style={{ width: '100%' }}>
            <Col>
              <Popconfirm
                title="Are you sure you want to delete this order?"
                onConfirm={async () => {
                  await handleDeleteOrderHistory(editOrder._id, false);
                  handleModalCancel();
                }}
                okText="Yes"
                cancelText="No"
              >
                <Button key="delete" type="primary" danger>Delete</Button>
              </Popconfirm>
            </Col>
            <Col>
              <Button key="cancel" onClick={handleModalCancel} style={{ marginRight: '10px' }}>Cancel</Button>
              <Button key="submit" type="primary" onClick={handleModalOk}>Save</Button>
            </Col>
          </Row>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            poNumber: editOrder?.poNumber,
            dateReceived: editOrder?.dateReceived ? new Date(editOrder.dateReceived).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            items: editOrder?.items || []
          }}
        >
          <Form.Item name="poNumber" label="PO Number" rules={[{ required: true, message: 'Please input the PO number!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dateReceived" label="Date Received" rules={[{ required: true, message: 'Please input the date received!' }]}>
            <Input type="date" />
          </Form.Item>
          <Row gutter={16} style={{ marginBottom: '8px' }}>
            <Col span={5}><strong>Item ID</strong></Col>
            <Col span={12}><strong>Description</strong></Col>
            <Col span={5}><strong>Quantity</strong></Col>
            <Col span={2}></Col>
          </Row>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Row key={key} gutter={16} style={{ marginBottom: '-12px' }}>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'itemId']}
                        rules={[{ required: true, message: 'Missing item ID' }]}
                      >
                        <Select
                          showSearch
                          placeholder="Item ID"
                          value={items[index]?.itemId}
                          onChange={(value) => handleInputChange(value, 'itemId', index, form)}
                          style={{ width: '100%' }}
                        >
                          {itemSuggestions.map(option => (
                            <Option key={option.itemid} value={option.itemid}>
                              {option.itemid}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        name={[name, 'description']}
                        rules={[{ required: true, message: 'Missing description' }]}
                      >
                        <Select
                          showSearch
                          placeholder="Description"
                          value={items[index]?.description}
                          onChange={(value) => handleInputChange(value, 'description', index, form)}
                          style={{ width: '100%' }}
                        >
                          {itemSuggestions.map(option => (
                            <Option key={option.description} value={option.description}>
                              {option.description}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantityReceived']}
                        rules={[{ required: true, message: 'Missing quantity' }]}
                      >
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={items[index]?.quantityReceived}
                          onChange={(e) => handleInputChange(e.target.value, 'quantityReceived', index, form)}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2} style={{ display: 'flex', alignItems: 'center', marginTop: '-26px' }}>
                      <Button
                        type="link"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        disabled={index === 0}
                      />
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                  >
                    Add Item
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
}

export default SavedOrderHistory;