import React, { useState, useEffect } from 'react';
import { Empty, Button, Table, Space, Modal, Form, Input, InputNumber, Spin, Pagination, Select, notification, Tooltip } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUser } from './UserContext';

function Items() {
  const [items, setItems] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();
  const [passwordInput, setPasswordInput] = useState('');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [itemHistory, setItemHistory] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorter, setSorter] = useState({ field: 'itemid', order: 'ascend' });
  const { currentUser } = useUser();
  const [originalItems, setOriginalItems] = useState([]);
  const [originalStock, setOriginalStock] = useState(0);
  const [itemsCurrentPage, setItemsCurrentPage] = useState(1);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const itemsPageSize = 10;
  const historyPageSize = 10;
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (editItem) {
      const calculatedStock = calculateAvailableStock(editItem.history);
      setOriginalStock(calculatedStock);
    }
  }, [editItem]);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (editItem) {
      form.setFieldsValue({
        itemid: editItem.itemid,
        description: editItem.description,
        material: editItem.material,
        comment: editItem.comment,
        availablestock: editItem.availablestock,
        minlevel: editItem.minlevel,
        maxlevel: editItem.maxlevel,
      });
    } else {
      form.resetFields();
    }
  }, [editItem]);

  const fetchItems = () => {
    setLoading(true);
    fetch('http://localhost:4000/items')
      .then(response => response.json())
      .then(data => {
        const itemsWithStock = data.map(item => ({
          ...item,
          availablestock: calculateAvailableStock(item.history),
        }));
        setItems(itemsWithStock);
        setOriginalItems(JSON.parse(JSON.stringify(itemsWithStock)));
        setLoading(false);
        notification.success({
          message: 'Items Fetched',
          description: 'Items have been successfully fetched.',
        });
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false);
        notification.error({
          message: 'Fetch Error',
          description: 'Failed to fetch items. Please try again.',
        });
      });
  };

  const handleEdit = () => {
    if (!editMode) {
      if (!passwordInput) {
        notification.warning({
          message: 'Input Required',
          description: 'Please enter the password to edit items.',
        });
        return;
      }

      if (passwordInput === 'GB') {
        setEditMode(true);
        notification.success({
          message: 'Edit Mode Activated',
          description: 'You have entered edit mode.',
        });
        setPasswordInput('');
        setOriginalItems(JSON.parse(JSON.stringify(items)));
      } else {
        notification.error({
          message: 'Invalid Password',
          description: 'The password you entered is incorrect.',
        });
      }
    } else {
      saveChanges();
    }
  };

  const saveChanges = () => {
    setLoading(true);
  
    const updatePromises = items.map(item => {
      const originalItem = originalItems.find(orig => orig.itemid === item.itemid);
      const updates = {};
  
      if (item.userInputStock !== undefined) {
        const currentStock = calculateAvailableStock(item.history);
        const difference = item.userInputStock - currentStock;
  
        if (difference !== 0) {
          const newHistoryEntry = `${currentUser.userid} ${difference >= 0 ? '+' : ''}${difference} Stock ${new Date().toISOString()}`;
          updates.history = [...item.history, newHistoryEntry];
          updates.availablestock = calculateAvailableStock(updates.history);
        }
      }
  
      if (item.minlevel !== originalItem.minlevel) {
        updates.minlevel = item.minlevel;
      }
  
      if (item.maxlevel !== originalItem.maxlevel) {
        updates.maxlevel = item.maxlevel;
      }
  
      if (item.description !== originalItem.description) {
        updates.description = item.description;
      }
  
      if (item.material !== originalItem.material) {
        updates.material = item.material;
      }
  
      if (item.comment !== originalItem.comment) {
        updates.comment = item.comment;
      }
  
      if (Object.keys(updates).length > 0) {
        const updatedItem = { ...item, ...updates };
        return fetch(`http://localhost:4000/items/${item.itemid}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedItem),
        });
      }
  
      return Promise.resolve();
    });
  
    Promise.all(updatePromises)
      .then(() => {
        setEditMode(false);
        fetchItems();
        notification.success({
          message: 'Changes Saved',
          description: 'All changes have been successfully saved.',
        });
      })
      .catch(error => {
        console.error('Error:', error);
        notification.error({
          message: 'Save Error',
          description: 'Failed to save changes. Please try again.',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };  

  const handleCancel = () => {
    setItems(JSON.parse(JSON.stringify(originalItems)));
    setEditMode(false);
    notification.info({
      message: 'Edit Mode Cancelled',
      description: 'Changes have been discarded and edit mode exited.',
    });
  };

  const handleDelete = (itemId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this item?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk() {
        fetch(`http://localhost:4000/items/${itemId}`, {
          method: 'DELETE',
        })
          .then(() => {
            fetchItems();
            notification.success({
              message: 'Item Deleted',
              description: 'The item has been successfully deleted.',
            });
          })
          .catch(error => {
            console.error('Error:', error);
            notification.error({
              message: 'Delete Error',
              description: 'Failed to delete the item. Please try again.',
            });
          });
      },
    });
  };

  const handleSubmit = (values) => {
    setLoading(true);
    const url = editItem ? `http://localhost:4000/items/${editItem.itemid}` : 'http://localhost:4000/items';
    const method = editItem ? 'PUT' : 'POST';

    const body = editItem ? values : {
      ...values,
      itemid: undefined,
      availablestock: values.availablestock || 0,
      username: currentUser.userid,
      minlevel: values.minlevel || 0,
      maxlevel: values.maxlevel || 0
    };

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setVisible(false);
        form.resetFields();
        fetchItems();
        setEditItem(null);
        notification.success({
          message: editItem ? 'Item Updated' : 'Item Added',
          description: `The item has been successfully ${editItem ? 'updated' : 'added'}.`,
        });
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false);
        notification.error({
          message: 'Submit Error',
          description: 'Failed to save the item. Please try again.',
        });
      });
  };

  const handleAddItem = () => {
    setEditItem(null);
    setVisible(true);
  };

  const fetchItemHistory = (itemId) => {
    fetch(`http://localhost:4000/items/${itemId}/history`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const formattedHistory = data.map(entry => {
            const [username, quantity, action, ...rest] = entry.split(' ');
            const change = `${quantity} ${action}`;

            const entryIdMatch = entry.match(/\((.*?)\)$/);
            const entryId = entryIdMatch ? entryIdMatch[1] : null;

            const timestampStr = entryId
              ? rest.slice(0, -1).join(' ')
              : rest.join(' ');

            const date = new Date(timestampStr);
            const formattedTimestamp = date.toLocaleString('en-GB', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            });

            return {
              change,
              timestamp: isNaN(date.getTime()) ? 'Invalid Date' : formattedTimestamp,
              username: username || 'Unknown User',
              entryId
            };
          });
          setItemHistory(formattedHistory);
          setHistoryModalVisible(true);
        } else {
          throw new Error('Unexpected data format');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        notification.error({
          message: 'Fetch Error',
          description: `Failed to fetch item history: ${error.message}`,
        });
      });
  };

  const handleItemClick = (itemId) => {
    if (!editMode) {
      const item = items.find(item => item.itemid === itemId);
      setSelectedItem(item);
      fetchItemHistory(itemId);
    }
  };

  const handleCloseHistoryModal = () => {
    setHistoryModalVisible(false);
    setItemHistory([]);
  };

  const handleCloseAddItemModal = () => {
    form.resetFields();
    setVisible(false);
    setEditItem(null);
  };

  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const calculateAvailableStock = (history) => {
    return history.reduce((total, entry) => {
      const match = entry.match(/([+-]\d+)/);
      if (match) {
        return total + parseInt(match[1], 10);
      }
      return total;
    }, 0);
  };

  const handleAvailableStockChange = (value, record) => {
    const currentUserLocal = currentUser.userid;
  
    const currentStock = calculateAvailableStock(record.history);
    const difference = value - currentStock;
  
    if (difference === 0) return;
  
    const newHistoryEntry = `${currentUserLocal} ${difference >= 0 ? '+' : ''}${difference} Stock ${new Date().toISOString()}`;
  
    const updatedItem = {
      ...record,
      history: [...record.history, newHistoryEntry],
      availablestock: calculateAvailableStock([...record.history, newHistoryEntry])
    };
  
    setItems(prevItems =>
      prevItems.map(item => (item.itemid === record.itemid ? updatedItem : item))
    );
  };  

  const handleFieldChange = (value, record, fieldName) => {
    if (fieldName === 'availablestock') {
      handleAvailableStockChange(value, record);
    } else {
      const updatedItems = items.map(item =>
        item.itemid === record.itemid ? { ...item, [fieldName]: value } : item
      );
      setItems(updatedItems);
    }
  };

  const columns = [
    {
      title: 'Item ID',
      dataIndex: 'itemid',
      key: 'itemid',
      sorter: (a, b) => a.itemid.localeCompare(b.itemid),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      render: (text, record) => (
        editMode ? (
          <Input value={text} onChange={(e) => handleFieldChange(e.target.value, record, 'description')} />
        ) : text
      )
    },
    {
      title: 'Material',
      dataIndex: 'material',
      key: 'material',
      sorter: (a, b) => a.material.localeCompare(b.material),
      render: (text, record) => (
        editMode ? (
          <Input value={text} onChange={(e) => handleFieldChange(e.target.value, record, 'material')} />
        ) : text
      )
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      sorter: (a, b) => a.comment.localeCompare(b.comment),
      render: (text, record) => (
        editMode ? (
          <Input value={text} onChange={(e) => handleFieldChange(e.target.value, record, 'comment')} />
        ) : text
      )
    },
    {
      title: 'Available Stock',
      dataIndex: 'availablestock',
      key: 'availablestock',
      sorter: (a, b) => calculateAvailableStock(a.history) - calculateAvailableStock(b.history),
      render: (text, record) => {
        const calculatedStock = calculateAvailableStock(record.history);

        return editMode ? (
          <InputNumber
            defaultValue={calculatedStock}
            onChange={(value) => handleStockInputChange(value, record)}
            min={0}
          />
        ) : calculatedStock;
      }

    },
    {
      title: 'Minimum',
      dataIndex: 'minlevel',
      key: 'minlevel',
      render: (text, record) => (
        editMode ? (
          <InputNumber
            value={record.minlevel}
            onChange={(value) => handleFieldChange(value, record, 'minlevel')}
            min={0}
          />
        ) : text
      ),
    },
    {
      title: 'Maximum',
      dataIndex: 'maxlevel',
      key: 'maxlevel',
      render: (text, record) => (
        editMode ? (
          <InputNumber
            value={record.maxlevel}
            onChange={(value) => handleFieldChange(value, record, 'maxlevel')}
            min={0}
          />
        ) : text
      ),
    },
    {
      key: 'action',
      render: (record) => (
        editMode && (
          <Space size="middle">
            <Button
              type="text"
              danger
              onClick={() => handleDelete(record.itemid)}
              icon={<DeleteOutlined style={{ color: 'red' }} />}
            />
          </Space>
        )
      ),
    }
  ];

  const handleStockInputChange = (value, record) => {

    const updatedItem = {
      ...record,
      userInputStock: value,
    };

    setItems(prevItems =>
      prevItems.map(item => (item.itemid === record.itemid ? updatedItem : item))
    );
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const historyColumns = [
    {
      title: 'Change',
      dataIndex: 'change',
      key: 'change',
      render: (text) => {
        const isPositive = text.startsWith('+');
        return (
          <span style={{ color: isPositive ? 'green' : 'red' }}>
            {text}
          </span>
        );
      }
    },
    {
      title: 'User',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
  ];

  const convertToISOFormat = (timestamp) => {
    const [date, time] = timestamp.split(', ');
    const [day, month, year] = date.split('/');
    return `${year}-${month}-${day}T${time}`;
  };

  const sortedHistory = [...itemHistory]
    .sort((a, b) => new Date(convertToISOFormat(b.timestamp)) - new Date(convertToISOFormat(a.timestamp)));

  const paginatedHistory = sortedHistory.slice(
    (historyCurrentPage - 1) * historyPageSize,
    historyCurrentPage * historyPageSize
  );

  const handleHistoryPageChange = (page) => {
    setHistoryCurrentPage(page);
  };

  const handleItemsPageChange = (page) => {
    setItemsCurrentPage(page);
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setSorter({ field: sorter.field, order: sorter.order });
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sorter.field) return 0;
    const order = sorter.order === 'ascend' ? 1 : -1;
    if (a[sorter.field] < b[sorter.field]) return -1 * order;
    if (a[sorter.field] > b[sorter.field]) return 1 * order;
    return 0;
  });

  const paginatedItems = sortedItems
    .filter(item =>
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemid.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ marginRight: '30px' }}>
      <Spin spinning={loading} style={{ display: loading ? 'block' : 'none' }}>
        <>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {!editMode ? (
                  <Tooltip title="Edit Items">
                    <Button
                      type="primary"
                      onClick={handleEdit}
                      icon={<EditOutlined />}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', fontSize: '16px' }}
                    >
                    </Button>
                  </Tooltip>
                ) : (
                  <>
                    <Button
                      type="primary"
                      onClick={saveChanges}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 12px',
                        fontSize: '16px',
                        marginRight: '8px',
                        backgroundColor: '#52c41a',
                        borderColor: '#52c41a'
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      onClick={handleCancel}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', fontSize: '16px' }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {!editMode && (
                  <Input
                    type="text"
                    style={{ marginLeft: 16, width: 240, WebkitTextSecurity: 'disc' }}
                    placeholder="Enter Master Password to Edit"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onPressEnter={handleEdit}
                    autoComplete="off"
                    id="edit-password-field"
                  />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {editMode && (
                  <Button
                    type="primary"
                    onClick={handleAddItem}
                    icon={<PlusOutlined />}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', fontSize: '16px', marginRight: 10 }}
                  >
                    Add Item
                  </Button>
                )}
                <Input.Search
                  placeholder="Search"
                  style={{ width: 300, display: 'flex', alignItems: 'center', height: '40px' }}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  id="search-items-field"
                />
              </div>
            </div>
          </div>
          {paginatedItems.length > 0 ? (
            <Table
              columns={columns}
              dataSource={paginatedItems}
              rowKey="itemid"
              pagination={false}
              onRow={(record) => ({
                onClick: () => handleItemClick(record.itemid),
              })}
              onChange={handleTableChange}
              sortDirections={['ascend', 'descend']}
              defaultSortOrder="ascend"
              defaultSortField="itemid"
            />
          ) : (
            <Empty description="No data" />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
            <Select
              defaultValue={pageSize}
              onChange={handlePageSizeChange}
              style={{ width: 100 }}
              options={[
                { value: 10, label: '10' },
                { value: 20, label: '20' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={items.length}
              onChange={handlePageChange}
              showSizeChanger={false}
              style={{ textAlign: 'right' }}
            />
          </div>
          <Modal
            title={<span style={{ fontSize: '20px' }}>Add Item</span>}
            open={visible}
            onCancel={handleCloseAddItemModal}
            footer={null}
            style={{ padding: '20px', borderRadius: '8px' }}
          >
            <Form form={form} onFinish={handleSubmit} layout="vertical">
              {!editItem && (
                <Form.Item label="Item ID" name="itemid">
                  <Input disabled />
                </Form.Item>
              )}
              <Form.Item label="Description" name="description" rules={[{ required: true }]}>
                <Input placeholder="Enter item description" />
              </Form.Item>
              <Form.Item label="Material" name="material">
                <Input placeholder="Enter material" />
              </Form.Item>
              <Form.Item label="Comment" name="comment">
                <Input placeholder="Enter comment" />
              </Form.Item>
              <Form.Item label="Available Stock" name="availablestock">
                <InputNumber min={0} placeholder="Enter available stock" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Minimum Level" name="minlevel">
                <InputNumber min={0} placeholder="Enter minimum level to be maintained" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Maximum Level" name="maxlevel">
                <InputNumber min={0} placeholder="Enter maximum level to be maintained" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" style={{ padding: '4px 12px', textAlign: 'center' }}>
                  Save
                </Button>
              </Form.Item>
            </Form>
          </Modal>
          <Modal
            title={`${selectedItem ? selectedItem.itemid : ''} - Current Stock: ${selectedItem ? calculateAvailableStock(selectedItem.history) : 0}`}
            open={historyModalVisible}
            onCancel={handleCloseHistoryModal}
            footer={null}
            width={600}
            style={{ padding: '20px', borderRadius: '8px' }}
          >
            <Table
              columns={historyColumns}
              dataSource={paginatedHistory}
              rowKey="timestamp"
              pagination={false}
              size="small"
            />
            <Pagination
              current={historyCurrentPage}
              pageSize={historyPageSize}
              total={sortedHistory.length}
              onChange={handleHistoryPageChange}
              style={{ textAlign: 'right', marginTop: '16px' }}
            />
          </Modal>
        </>
      </Spin>
    </div>
  );
}

export default Items;