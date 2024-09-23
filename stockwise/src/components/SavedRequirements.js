import React, { useEffect, useState, useRef } from 'react';
import { Empty, Card, Collapse, Input, List, Row, Col, Pagination, Select, Button, Modal, Spin, notification, Tooltip, Form, Input as AntdInput, Popconfirm, Skeleton } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { useItemChange } from './useItemChange';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import '../SavedRequirements.css';

const { Panel } = Collapse;
const { Option } = Select;

function SavedRequirements({ refresh, itemSuggestions }) {
  const [requirements, setRequirements] = useState([]);
  const [filteredRequirements, setFilteredRequirements] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editRequirement, setEditRequirement] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [sortOrder, setSortOrder] = useState('desc');
  const [showEditButtons, setShowEditButtons] = useState(false);
  const { items, setItems, handleInputChange } = useItemChange(itemSuggestions);
  const prevRequirementsRef = useRef([]);

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/requirements`);
      const data = await response.json();
      setRequirements(data);
      setFilteredRequirements(data);
    } catch (error) {
      notification.error({ message: 'Failed to fetch requirements' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [refresh]);

  useEffect(() => {
    const filtered = requirements.filter(req =>
      req.jobNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRequirements(filtered);
    setCurrentPage(1);
  }, [searchTerm, requirements]);

  useEffect(() => {
    const sorted = [...filteredRequirements].sort((a, b) => {
      const dateA = new Date(a.neededBy);
      const dateB = new Date(b.neededBy);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    setFilteredRequirements(sorted);
  }, [sortOrder, requirements]);

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => (prevOrder === 'desc' ? 'asc' : 'desc'));
  };

  function parseDate(dateString) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
  }

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const paginatedRequirements = filteredRequirements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleEdit = (requirement) => {
    form.setFieldsValue({
      jobNumber: requirement.jobNumber,
      neededBy: requirement.neededBy ? new Date(requirement.neededBy).toISOString().split('T')[0] : '',
      items: requirement.items
    });

    setItems(JSON.parse(JSON.stringify(requirement.items)));

    setEditRequirement(requirement);
    setIsEditing(true);
  };

  const handleDelete = async (id, isFromModal = false) => {
    if (!isFromModal) {
      Modal.confirm({
        title: 'Are you sure you want to delete this requirement?',
        onOk: async () => {
          await executeDelete(id);
        },
        onCancel() { },
      });
    } else {
      await executeDelete(id);
    }
  };

  const executeDelete = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/requirements/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setRequirements(prevRequirements => prevRequirements.filter(req => req._id !== id));
        setFilteredRequirements(prevRequirements => prevRequirements.filter(req => req._id !== id));
        notification.success({ message: 'Requirement deleted successfully' });
      } else {
        const errorData = await response.json();
        notification.error({ message: errorData.error || 'Failed to delete requirement' });
      }
    } catch (error) {
      notification.error({ message: 'Failed to delete requirement' });
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editRequirement) {

        const response = await fetch(`${process.env.REACT_APP_API_URL}/requirements/${editRequirement._id}`, {
          method: 'PUT',
          body: JSON.stringify(values),
          headers: { 'Content-Type': 'application/json' }
        });
        const updatedRequirement = await response.json();

        setRequirements(prevRequirements => prevRequirements.map(req => req._id === updatedRequirement._id ? updatedRequirement : req));
        setFilteredRequirements(prevRequirements => prevRequirements.map(req => req._id === updatedRequirement._id ? updatedRequirement : req));
      } else {

        const response = await fetch(`${process.env.REACT_APP_API_URL}/requirements`, {
          method: 'POST',
          body: JSON.stringify(values),
          headers: { 'Content-Type': 'application/json' }
        });
        const newRequirement = await response.json();

        setRequirements(prevRequirements => [...prevRequirements, newRequirement]);
        setFilteredRequirements(prevRequirements => [...prevRequirements, newRequirement]);
      }

      notification.success({ message: 'Requirement saved successfully' });

      // Reset modal state after saving
      setIsEditing(false);
      setEditRequirement(null);
    } catch (error) {
      notification.error({ message: 'Failed to save requirement' });
    } finally {
      setLoading(false);
    }
  };

  const handleModalCancel = () => {
    form.resetFields();

    setItems(editRequirement?.items || []);

    setIsEditing(false);
    setEditRequirement(null);
  };

  useEffect(() => {
    prevRequirementsRef.current = requirements;
  });
  const prevRequirements = prevRequirementsRef.current;

  const isRequirementAddedOrRemoved = (requirement) => {
    const prevRequirementIds = prevRequirements.map(req => req._id.$oid);
    const currentRequirementIds = requirements.map(req => req._id.$oid);
    return !prevRequirementIds.includes(requirement._id.$oid) || !currentRequirementIds.includes(requirement._id.$oid);
  };

  return (
    <>
      <Card
        title="Requirements"
        style={{ marginTop: '20px', border: 'none' }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input.Search
              placeholder="Search by Job Number"
              style={{ width: 300, marginRight: '16px' }}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="search-items-field"
            />
            <Button
              icon={sortOrder === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
              onClick={toggleSortOrder}
              style={{ marginRight: '16px' }}
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
              >
                {showEditButtons ? 'Save' : 'Edit'}
              </Button>
            </Button.Group>
          </div>
        }
      >
        {loading ? (
          <Skeleton active />
        ) : (
          <div style={{ display: 'block' }}>
            {paginatedRequirements.length > 0 ? (
              <TransitionGroup>
                {paginatedRequirements.map(requirement => (
                  <CSSTransition
                    key={requirement._id.$oid}
                    timeout={500}
                    classNames={isRequirementAddedOrRemoved(requirement) ? "fade" : "page-change"}
                  >
                    <Collapse key={requirement._id.$oid} bordered={true} style={{ marginBottom: '10px' }}>
                      <Panel
                        header={
                          <Row>
                            <Col span={12}><strong>Job Number:</strong> {requirement.jobNumber}</Col>
                            <Col span={12}><strong>Date Required By:</strong> {parseDate(requirement.neededBy)}</Col>
                          </Row>
                        }
                        key={requirement._id.$oid}
                        extra={
                          showEditButtons && (
                            <>
                              <Button
                                type="link"
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(requirement)}
                              />
                              <Tooltip title="Delete">
                                <Button
                                  type="link"
                                  icon={<DeleteOutlined style={{ color: 'red' }} />}
                                  onClick={() => handleDelete(requirement._id)}
                                />
                              </Tooltip>
                            </>
                          )
                        }
                      >
                        <List
                          itemLayout="horizontal"
                          dataSource={requirement.items}
                          renderItem={item => (
                            <List.Item>
                              <List.Item.Meta
                                title={`Item ID: ${item.itemId}`}
                                description={item.description}
                              />
                              <div>Quantity: {item.quantityNeeded}</div>
                            </List.Item>
                          )}
                        />
                      </Panel>
                    </Collapse>
                  </CSSTransition>
                ))}
              </TransitionGroup>
            ) : (
              <Empty description="No data" />
            )}
          </div>
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
              total={filteredRequirements.length}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
          </Col>
        </Row>
      </Card>

      <Modal
        title="Edit Requirement"
        open={isEditing}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
        footer={[
          <Row justify="space-between" style={{ width: '100%' }}>
            <Col>
              <Popconfirm
                title="Are you sure you want to delete this requirement?"
                onConfirm={async () => {
                  await handleDelete(editRequirement._id, true);
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
            jobNumber: editRequirement?.jobNumber,
            neededBy: editRequirement?.neededBy ? new Date(editRequirement.neededBy).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            items: editRequirement?.items || []
          }}
        >
          <Form.Item name="jobNumber" label="Job Number" rules={[{ required: true, message: 'Please input the job number!' }]}>
            <AntdInput />
          </Form.Item>
          <Form.Item name="neededBy" label="Date Required By" rules={[{ required: true, message: 'Please input the date!' }]}>
            <AntdInput type="date" />
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
                        name={[name, 'quantityNeeded']}
                        rules={[{ required: true, message: 'Missing quantity' }]}
                      >
                        <AntdInput
                          type="number"
                          placeholder="Qty"
                          value={items[index]?.quantityNeeded}
                          onChange={(e) => handleInputChange(e.target.value, 'quantityNeeded', index, form)}
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

export default SavedRequirements;