import React, { useState, useEffect } from 'react';
import '@fontsource/open-sans';
import { Card, Form, Input, Button, DatePicker, Row, Col, Select, message, Skeleton, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useItemChange } from './useItemChange';
import SavedUseHistory from './SavedUseHistory';
import { useUser } from './UserContext';

function UseHistory({ itemSuggestions }) {
  const { items, setItems, handleInputChange } = useItemChange(itemSuggestions);
  const [form] = Form.useForm();
  const { Option } = Select;
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const { currentUser } = useUser();

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 50);
  }, []);

  const handleAddItem = () => {
    setItems([...items, { itemId: '', description: '', quantityUsed: '' }]);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const useData = {
        jobNumber: values.jobNumber,
        dateUsed: values.dateUsed.toISOString(),
        items: items.map(item => ({
          itemId: item.itemId,
          description: item.description,
          quantityUsed: item.quantityUsed
        }))
      };
  
      const userId = currentUser.userid;
  
      const response = await fetch(`${process.env.REACT_APP_API_URL}/use-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'current-user': userId
        },
        body: JSON.stringify(useData),
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      message.success('Use History saved successfully');
      form.resetFields();
      setItems([{ itemId: '', description: '', quantityUsed: '' }]);
      setRefresh(!refresh);
    } catch (error) {
      console.error('Submission error:', error);
      message.error('Please fill all fields correctly');
    }
  };

  return (
    <div style={{ marginRight: '30px' }}>
      {loading ? (
        <>
          <Card title="Add Use History" style={{ marginBottom: '20px' }}>
            <Skeleton active>
              <Skeleton.Input style={{ width: '100%' }} active />
              <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
              <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
              <Skeleton.Button style={{ width: '100%', marginTop: '16px' }} active />
            </Skeleton>
          </Card>
          <Card title="Use History" style={{ marginBottom: '20px' }}>
            <Skeleton active>
              <Skeleton.Input style={{ width: '100%' }} active />
              <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
              <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
              <Skeleton.Button style={{ width: '100%', marginTop: '16px' }} active />
            </Skeleton>
          </Card>
        </>
      ) : (
        <>
          <Card title="Add Use History">
            <Form form={form} onFinish={handleSubmit}>
              <Row style={{ marginBottom: '16px' }}>
                <Col span={24} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '150px' }}>
                    Job Number
                    <Tooltip title="If you don't know the job number, enter 'Stock' in the field">
                      <InfoCircleOutlined
                        style={{ marginLeft: '8px', color: '#1890ff', transform: 'scale(0.75)', verticalAlign: 'middle' }}
                      />
                    </Tooltip>
                  </div>
                  <Form.Item
                    name="jobNumber"
                    rules={[{ required: true, message: 'Job Number is required' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <Input placeholder="Enter Job Number" style={{ width: '240px' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row style={{ marginBottom: '25px' }}>
                <Col span={24} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '150px' }}>Date Used</div>
                  <Form.Item
                    name="dateUsed"
                    rules={[{ required: true, message: 'Receiving date is required' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <DatePicker placeholder="Select Date" style={{ width: '240px' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                <Col span={6} style={{ paddingLeft: '4px' }}>Item ID</Col>
                <Col span={10} style={{ paddingLeft: '4px' }}>Item Description</Col>
                <Col span={6} style={{ paddingLeft: '5px' }}>Quantity Used</Col>
                <Col span={1}></Col>
              </Row>

              {items.map((item, index) => (
                <Row key={index} gutter={8} align="middle" style={{ marginBottom: '8px' }}>
                  <Col span={6}>
                    <Form.Item
                      name={['items', index, 'itemId']}
                      rules={[{ required: true, message: 'Item ID is required' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        showSearch
                        placeholder="Item ID"
                        value={item.itemId}
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
                  <Col span={10}>
                    <Form.Item
                      name={['items', index, 'description']}
                      rules={[{ required: true, message: 'Description is required' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        showSearch
                        placeholder="Description"
                        value={item.description}
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
                  <Col span={6}>
                    <Form.Item
                      name={['items', index, 'quantityUsed']}
                      rules={[{ required: true, message: 'Quantity used is required' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantityUsed}
                        onChange={(e) => handleInputChange(e.target.value, 'quantityUsed', index, form)}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={1} style={{ textAlign: 'center' }}>
                    {index !== 0 && (
                      <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveItem(index)}
                        style={{ paddingLeft: '0', paddingRight: '0' }}
                      />
                    )}
                  </Col>
                </Row>
              ))}

              <Row>
                <Col span={22}>
                  <Button
                    type="dashed"
                    onClick={handleAddItem}
                    icon={<PlusOutlined />}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                  </Button>
                </Col>
              </Row>

              <Form.Item style={{ marginTop: '20px' }}>
                <Button type="primary" htmlType="submit">
                  Submit
                </Button>
                <Button
                  type="default"
                  onClick={() => { form.resetFields(); setItems([{ itemId: '', description: '', quantityUsed: '' }]); }}
                  style={{ marginLeft: '8px' }}
                >
                  Clear Form
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <SavedUseHistory refresh={refresh} itemSuggestions={itemSuggestions} />

        </>
      )}
    </div>
  );
}

export default UseHistory;