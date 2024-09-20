import React, { useState, useEffect } from 'react';
import '@fontsource/open-sans';
import { Card, Form, Input, Button, DatePicker, Row, Col, Select, message, Skeleton } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import SavedRequirements from './SavedRequirements';
import { useItemChange } from './useItemChange';
import '../Requirements.css';

function Requirements({ itemSuggestions }) {
  const { items, setItems, handleInputChange } = useItemChange(itemSuggestions);
  const [form] = Form.useForm();
  const { Option } = Select;
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 50);
  }, []);

  const handleAddItem = () => {
    setItems([...items, { itemId: '', description: '', quantityNeeded: '' }]);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const requirementData = {
        jobNumber: values.jobNumber,
        neededBy: values.neededBy.toISOString(),
        items: items.map(item => ({
          itemId: item.itemId,
          description: item.description,
          quantityNeeded: item.quantityNeeded
        }))
      };

      const response = await fetch('http://localhost:4000/requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requirementData),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      message.success('Requirements submitted successfully');
      form.resetFields();
      setItems([{ itemId: '', description: '', quantityNeeded: '' }]);
      setRefresh(!refresh);
    } catch (error) {
      console.error('Submission error:', error);
      message.error('Please fill all fields correctly');
    }
  };

  if (loading) {
    return (
      <div style={{ marginRight: '30px' }}>
        <Card title="Add Requirements" style={{ marginBottom: '20px' }}>
          <Skeleton active>
            <Skeleton.Input style={{ width: '100%' }} active />
            <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
            <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
            <Skeleton.Button style={{ width: '100%', marginTop: '16px' }} active />
          </Skeleton>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ marginRight: '30px' }}>
      {loading ? (
        <>
          <Skeleton active>
            <Card title={<Skeleton.Input style={{ width: '150px' }} active />} style={{ marginBottom: '20px' }}>
              <Skeleton.Input style={{ width: '100%' }} active />
              <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
              <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
              <Skeleton.Button style={{ width: '100%', marginTop: '16px' }} active />
            </Card>
          </Skeleton>

          <Skeleton active>
            <Card title={<Skeleton.Input style={{ width: '150px' }} active />} style={{ marginBottom: '20px' }}>
              <Skeleton.Input style={{ width: '100%' }} active />
              <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
              <Skeleton.Input style={{ width: '100%', marginTop: '16px' }} active />
              <Skeleton.Button style={{ width: '100%', marginTop: '16px' }} active />
            </Card>
          </Skeleton>
        </>
      ) : (
        <>
          <Card title="Add Requirements">
            <Form form={form} onFinish={handleSubmit}>
              <Row style={{ marginBottom: '16px' }}>
                <Col span={24} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '150px' }}>Job Number</div>
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
                  <div style={{ width: '150px' }}>Date Required By</div>
                  <Form.Item
                    name="neededBy"
                    rules={[{ required: true, message: 'Date Required By is required' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <DatePicker placeholder="Select Date" style={{ width: '240px' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                <Col span={6} style={{ paddingLeft: '4px' }}>Item ID</Col>
                <Col span={10} style={{ paddingLeft: '4px' }}>Item Description</Col>
                <Col span={6} style={{ paddingLeft: '5px' }}>Quantity Required</Col>
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
                      name={['items', index, 'quantityNeeded']}
                      rules={[{ required: true, message: 'Quantity is required' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantityNeeded}
                        min={1}
                        onChange={(e) => handleInputChange(e.target.value, 'quantityNeeded', index, form)}
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
                  ></Button>
                </Col>
              </Row>

              <Form.Item style={{ marginTop: '20px' }}>
                <Button type="primary" htmlType="submit">
                  Submit
                </Button>
                <Button type="default" onClick={() => { form.resetFields(); setItems([{ itemId: '', description: '', quantityNeeded: '' }]); }} style={{ marginLeft: '8px' }}>
                  Clear Form
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <SavedRequirements refresh={refresh} itemSuggestions={itemSuggestions} />
        </>
      )}
    </div>
  );
}

export default Requirements;