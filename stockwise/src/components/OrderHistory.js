import React, { useState, useEffect } from 'react';
import '@fontsource/open-sans';
import { Card, Form, Input, Button, DatePicker, Row, Col, Select, message, Skeleton } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useItemChange } from './useItemChange';
import SavedOrderHistory from './SavedOrderHistory';
import { useUser } from './UserContext';

function OrderHistory({ itemSuggestions }) {
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
    setItems([...items, { itemId: '', description: '', quantityReceived: '' }]);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const orderData = {
        poNumber: values.poNumber,
        dateReceived: values.dateReceived.toISOString(),
        items: items.map(item => ({
          itemId: item.itemId,
          description: item.description,
          quantityReceived: item.quantityReceived
        }))
      };
  
      const userId = currentUser.userid;
  
      const response = await fetch(`${process.env.REACT_APP_API_URL}/order-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'current-user': userId
        },
        body: JSON.stringify(orderData),
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      message.success('PO saved successfully');
      form.resetFields();
      setItems([{ itemId: '', description: '', quantityReceived: '' }]);
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
          <Card title="Add Purchase Order">
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
          <Card title="Add Purchase Order">
            <Form form={form} onFinish={handleSubmit}>
              <Row style={{ marginBottom: '16px' }}>
                <Col span={24} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '150px' }}>PO Number</div>
                  <Form.Item
                    name="poNumber"
                    rules={[{ required: true, message: 'PO Number is required' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <Input placeholder="Enter PO Number" style={{ width: '240px' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row style={{ marginBottom: '25px' }}>
                <Col span={24} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '150px' }}>Date Received</div>
                  <Form.Item
                    name="dateReceived"
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
                <Col span={6} style={{ paddingLeft: '5px' }}>Quantity Received</Col>
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
                      name={['items', index, 'quantityReceived']}
                      rules={[{ required: true, message: 'Quantity received is required' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantityReceived}
                        onChange={(e) => handleInputChange(e.target.value, 'quantityReceived', index, form)}
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
                  onClick={() => { form.resetFields(); setItems([{ itemId: '', description: '', quantityReceived: '' }]); }}
                  style={{ marginLeft: '8px' }}
                >
                  Clear Form
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <SavedOrderHistory refresh={refresh} itemSuggestions={itemSuggestions} />
          
        </>
      )}
    </div>
  );
}

export default OrderHistory;