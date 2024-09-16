import { useState } from 'react';

export const useItemChange = (itemSuggestions) => {
  const [items, setItems] = useState([{ itemId: '', description: '', quantityNeeded: '', quantityReceived: '' }]);

  const handleInputChange = (value, type, index, form) => {
    const updatedItems = [...items];

    if (type === 'itemId') {
      const selected = itemSuggestions.find(item => item.itemid === value);
      if (selected) {
        updatedItems[index] = {
          ...updatedItems[index],
          itemId: selected.itemid,
          description: selected.description
        };
      } else {
        updatedItems[index].description = '';
      }
    } else if (type === 'description') {
      const selected = itemSuggestions.find(item => item.description === value);
      if (selected) {
        updatedItems[index] = {
          ...updatedItems[index],
          itemId: selected.itemid,
          description: selected.description
        };
      } else {
        updatedItems[index].itemId = '';
      }
    } else if (type === 'quantityNeeded') {
      updatedItems[index].quantityNeeded = value;
    } else if (type === 'quantityReceived') {
      updatedItems[index].quantityReceived = value;
    } else if (type === 'quantityUsed') {
      updatedItems[index].quantityUsed = value;
    }

    setItems(updatedItems);
    form.setFieldsValue({ items: updatedItems });
  };

  return { items, setItems, handleInputChange };
};