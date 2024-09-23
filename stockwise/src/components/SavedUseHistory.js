import React, { useEffect, useState, useRef } from 'react';
import { Empty, Card, Collapse, Input, List, Row, Col, Pagination, Select, Button, Modal, Spin, notification, Tooltip, Form, Popconfirm, Skeleton } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { useItemChange } from './useItemChange';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { useUser } from './UserContext';

const { Panel } = Collapse;
const { Option } = Select;

function SavedUseHistory({ refresh, itemSuggestions }) {
  const [uses, setUses] = useState([]);
  const [filteredUses, setFilteredUses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editUse, setEditUse] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [sortUse, setSortUse] = useState('desc');
  const [showEditButtons, setShowEditButtons] = useState(false);
  const [activePanels, setActivePanels] = useState([]);
  const { items, setItems, handleInputChange } = useItemChange(itemSuggestions);
  const prevUsesRef = useRef([]);
  const { currentUser } = useUser();

  const fetchUses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/use-history`);
      const data = await response.json();
      setUses(data);
      setFilteredUses(data);
    } catch (error) {
      notification.error({ message: 'Failed to fetch use history' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUses();
  }, [refresh]);

  useEffect(() => {
    if (Array.isArray(uses)) {
      const filtered = uses.filter(use =>
        use && use.jobNumber && use.jobNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUses(filtered);
    } else {
      setFilteredUses([]);
    }
    setCurrentPage(1);
  }, [searchTerm, uses]);

  useEffect(() => {
    const sorted = [...filteredUses].sort((a, b) => {
      const dateA = a?.dateUsed ? new Date(a.dateUsed) : new Date(0);
      const dateB = b?.dateUsed ? new Date(b.dateUsed) : new Date(0);
      return sortUse === 'desc' ? dateB - dateA : dateA - dateB;
    });
    setFilteredUses(sorted);
  }, [sortUse, uses]);

  const toggleSortUse = () => {
    setSortUse(prevUse => (prevUse === 'desc' ? 'asc' : 'desc'));
  };

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const handleEdit = (use) => {
    form.setFieldsValue({
      jobNumber: use.jobNumber,
      dateUsed: use.dateUsed ? new Date(use.dateUsed).toISOString().split('T')[0] : '',
      items: use.items
    });
    setItems(use.items);
    setEditUse(use);
    setIsEditing(true);
  };

  const handleDeleteUseHistory = async (id, isFromCard = true) => {
    if (isFromCard) {
      Modal.confirm({
        title: 'Are you sure you want to delete this use from history?',
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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/use-history/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setUses(prevUses => prevUses.filter(use => use._id !== id));
        setFilteredUses(prevUses => prevUses.filter(use => use._id !== id));
        notification.success({ message: 'Use deleted successfully' });
      } else {
        notification.error({ message: 'Failed to delete use' });
      }
    } catch (error) {
      notification.error({ message: 'Failed to delete use' });
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editUse) {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/use-history/${editUse._id}`, {
          method: 'PUT',
          body: JSON.stringify(values),
          headers: { 'Content-Type': 'application/json', 'current-user': currentUser }
        });
        const updatedUse = await response.json();
        setUses(prevUses => prevUses.map(use => use._id === updatedUse._id ? updatedUse : use));
        setFilteredUses(prevUses => prevUses.map(use => use._id === updatedUse._id ? updatedUse : use));
      }
      notification.success({ message: 'Use History saved successfully' });
      setIsEditing(false);
      setEditUse(null);
    } catch (error) {
      notification.error({ message: 'Failed to save use history' });
    } finally {
      setLoading(false);
    }
  };

  const handleModalCancel = () => {
    setIsEditing(false);
    setEditUse(null);
  };

  const handlePanelChange = (key) => {
    setActivePanels(key);
  };

  const paginatedUses = Array.isArray(filteredUses)
    ? filteredUses.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : [];

  return (
    <>
      <Card
        title="Use History"
        style={{ marginTop: '20px', border: 'none' }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input.Search
              placeholder="Search by Job Number"
              style={{ width: 300, marginRight: '16px' }}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="search-items-field"
              disabled={loading}
            />
            <Button
              icon={sortUse === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
              onClick={toggleSortUse}
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
          <Skeleton active>
            <Skeleton.Input style={{ width: '100%' }} active />
            <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
            <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
          </Skeleton>
        ) : (
          <Spin spinning={loading} style={{ paddingTop: '20px' }}>
            <div style={{ display: loading ? 'none' : 'block' }}>
              {!loading && paginatedUses.length > 0 ? (
                <TransitionGroup>
                  {paginatedUses.map(use => (
                    <CSSTransition
                      key={use._id.$oid}
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
                              <Col span={12}><strong>Job Number:</strong> {use.jobNumber || 'N/A'}</Col>
                              <Col span={12}><strong>Date Used:</strong> {use.dateUsed ? new Date(use.dateUsed).toLocaleDateString() : 'N/A'}</Col>
                            </Row>
                          }
                          key={use._id.$oid}
                          extra={
                            showEditButtons && (
                              <>
                                <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(use)} />
                                <Tooltip title="Delete">
                                  <Button type="link" icon={<DeleteOutlined style={{ color: 'red' }} />} onClick={() => handleDeleteUseHistory(use._id)} />
                                </Tooltip>
                              </>
                            )
                          }
                        >
                          <List
                            itemLayout="horizontal"
                            dataSource={use.items || []}
                            renderItem={item => (
                              <List.Item>
                                <List.Item.Meta
                                  title={`Item ID: ${item.itemId || 'N/A'}`}
                                  description={item.description || 'N/A'}
                                />
                                <div>Quantity Used: {item.quantityUsed || 'N/A'}</div>
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
              total={filteredUses.length}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
          </Col>
        </Row>
      </Card>

      <Modal
        title="Edit Use"
        open={isEditing}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        footer={[
          <Row justify="space-between" style={{ width: '100%' }}>
            <Col>
              <Popconfirm
                title="Are you sure you want to delete this use?"
                onConfirm={async () => {
                  await handleDeleteUseHistory(editUse._id, false);
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
            jobNumber: editUse?.jobNumber,
            dateUsed: editUse?.dateUsed ? new Date(editUse.dateUsed).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            items: editUse?.items || []
          }}
        >
          <Form.Item name="jobNumber" label="Job Number" rules={[{ required: true, message: 'Please input the Job number!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dateUsed" label="Date Used" rules={[{ required: true, message: 'Please input the date used!' }]}>
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
                        name={[name, 'quantityUsed']}
                        rules={[{ required: true, message: 'Missing quantity' }]}
                      >
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={items[index]?.quantityUsed}
                          onChange={(e) => handleInputChange(e.target.value, 'quantityUsed', index, form)}
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

export default SavedUseHistory;