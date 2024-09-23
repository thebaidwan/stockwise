const express = require('express');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { ObjectId } = mongoose.Types;
const moment = require('moment-timezone'); 

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const { v4: uuidv4 } = require('uuid');

const { body, validationResult } = require('express-validator');

app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Could not connect to MongoDB Atlas', err));

app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(morgan('combined'));

app.use(express.json());

app.use(express.static(path.join(__dirname, '../stockwise/public')));

const itemSchema = new mongoose.Schema({
  itemid: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  material: String,
  comment: String,
  history: { type: [String], default: [] },
  minlevel: { type: Number, default: 0 },
  maxlevel: { type: Number, default: 0 }
});

const Item = mongoose.model('Item', itemSchema);

async function generateUniqueItemId() {
  const lastItem = await Item.findOne().sort({ itemid: -1 });
  if (lastItem) {
    const lastItemId = parseInt(lastItem.itemid.slice(1));
    return 'I' + ('000' + (lastItemId + 1)).slice(-3);
  } else {
    return 'I001';
  }
}

app.get('/items', async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/items', async (req, res) => {
  const { description, material, comment, minlevel = 0, maxlevel = 0, availablestock = 0, username } = req.body;
  try {
    const itemid = await generateUniqueItemId();
    const currentDate = new Date().toISOString();
    const initialHistoryEntry = `${username} +${availablestock} Stock ${currentDate}`;

    const newItem = new Item({
      itemid,
      description,
      material,
      comment,
      history: [initialHistoryEntry],
      minlevel,
      maxlevel
    });

    await newItem.save();
    res.json(newItem);
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/items/:id', async (req, res) => {
  const itemId = req.params.id;
  const { description, material, comment, history, availablestock, minlevel = 0, maxlevel = 0 } = req.body;
  try {
    const updatedItem = await Item.findOneAndUpdate(
      { itemid: itemId },
      {
        $set: { description, material, comment, history, availablestock, minlevel, maxlevel }
      },
      { new: true }
    );
    res.json(updatedItem);
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/items/:id', async (req, res) => {
  const itemId = req.params.id;
  try {
    await Item.deleteOne({ itemid: itemId });
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

app.get('/items/:id/history', async (req, res) => {
  const itemId = req.params.id;
  try {
    const item = await Item.findOne({ itemid: itemId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item.history);
  } catch (err) {
    console.error('Error fetching item history:', err);
    res.status(500).json({ error: 'Failed to fetch item history' });
  }
});

const userSchema = new mongoose.Schema({
  userid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  securityQuestion: { type: String, required: true },
  securityAnswer: { type: String, required: true }
});

const User = mongoose.model('User', userSchema, 'users');

app.post('/signup', [
  body('email').isEmail().withMessage('Enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('userid').notEmpty().withMessage('User ID is required'),
  body('securityAnswer').notEmpty().withMessage('Security answer is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userid, email, password, securityQuestion, securityAnswer } = req.body;
  try {
    const existingUser = await User.findOne({ userid });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAnswer = await bcrypt.hash(securityAnswer, 10);
    const newUser = new User({ userid, email, password: hashedPassword, securityQuestion, securityAnswer: hashedAnswer });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/signin', async (req, res) => {
  const { useridOrEmail, password, rememberMe } = req.body;
  try {
    const user = await User.findOne({ $or: [{ userid: useridOrEmail }, { email: useridOrEmail }] });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    if (rememberMe) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      res.cookie('userid', user.userid, { expires: expiryDate, httpOnly: true });
    }
    
    res.status(200).json({ userid: user.userid, email: user.email, message: 'Signin successful' });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/identify-user', async (req, res) => {
  const { userIdOrEmail } = req.body;
  try {
    const user = await User.findOne({ $or: [{ userid: userIdOrEmail }, { email: userIdOrEmail }] });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user: { userid: user.userid }, securityQuestion: user.securityQuestion });
  } catch (error) {
    console.error('Identify user error:', error);
    res.status(500).json({ error: 'Failed to identify user' });
  }
});

app.post('/verify-security-answer', async (req, res) => {
  const { userid, securityAnswer } = req.body;
  try {
    const user = await User.findOne({ userid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isAnswerValid = await bcrypt.compare(securityAnswer, user.securityAnswer);
    if (!isAnswerValid) {
      return res.status(401).json({ error: 'Incorrect security answer' });
    }
    res.status(200).json({ message: 'Security answer verified' });
  } catch (error) {
    console.error('Verify security answer error:', error);
    res.status(500).json({ error: 'Failed to verify security answer' });
  }
});

app.post('/reset-password', async (req, res) => {
  const { userid, newPassword } = req.body;
  try {
    const user = await User.findOne({ userid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.put('/change-password', async (req, res) => {
  const { userid, currentPassword, newPassword } = req.body;
  try {
    const user = await User.findOne({ userid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('userid');
  res.status(200).json({ message: 'Logout successful' });
});

app.put('/update-username', async (req, res) => {
  const { userid, newUsername } = req.body;
  try {
    const existingUser = await User.findOne({ userid: newUsername });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { userid: userid },
      { $set: { userid: newUsername } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

app.put('/update-email', async (req, res) => {
  const { userid, newEmail } = req.body;
  try {
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { userid: userid },
      { $set: { email: newEmail } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

app.delete('/delete-account', async (req, res) => {
  const { userid } = req.body;
  try {
    const user = await User.findOneAndDelete({ userid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.clearCookie('userid');
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

const requirementSchema = new mongoose.Schema({
  jobNumber: { type: String, required: true },
  neededBy: { type: Date, required: true },
  items: [{
    itemId: { type: String, required: true },
    description: { type: String, required: true },
    quantityNeeded: { type: Number, required: true }
  }]
});

const Requirement = mongoose.model('Requirement', requirementSchema);

app.get('/requirements', async (req, res) => {
  try {
    const requirements = await Requirement.find();
    res.json(requirements);
  } catch (err) {
    console.error('Error fetching requirements:', err);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

app.post('/requirements', async (req, res) => {
  const { jobNumber, neededBy, items } = req.body;
  try {
    const newRequirement = new Requirement({ jobNumber, neededBy, items });
    await newRequirement.save();
    res.json(newRequirement);
  } catch (err) {
    console.error('Error creating requirement:', err);
    res.status(500).json({ error: 'Failed to create requirement' });
  }
});

app.put('/requirements/:id', async (req, res) => {
  const requirementId = req.params.id;
  const { jobNumber, neededBy, items } = req.body;
  try {
    const updatedRequirement = await Requirement.findOneAndUpdate(
      { _id: new ObjectId(requirementId) },
      { $set: { jobNumber, neededBy, items } },
      { new: true }
    );
    res.json(updatedRequirement);
  } catch (err) {
    console.error('Error updating requirement:', err);
    res.status(500).json({ error: 'Failed to update requirement' });
  }
});

app.delete('/requirements/:id', async (req, res) => {
  const requirementId = req.params.id;
  try {
    const result = await Requirement.deleteOne({ _id: new ObjectId(requirementId) });
    console.log(`Delete result: ${JSON.stringify(result)}`);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    res.json({ message: 'Requirement deleted successfully' });
  } catch (err) {
    console.error('Error deleting requirement:', err);
    res.status(500).json({ error: 'Failed to delete requirement' });
  }
});

const orderhistorySchema = new mongoose.Schema({
  entryId: { type: String, unique: true, required: true },
  poNumber: { type: String, required: true },
  dateReceived: { type: Date, required: true },
  items: [{
    itemId: { type: String, required: true },
    description: { type: String, required: true },
    quantityReceived: { type: Number, required: true }
  }],
  itemHistoryReferences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }]
});

const OrderHistory = mongoose.model('OrderHistory', orderhistorySchema);

app.get('/order-history', async (req, res) => {
  try {
    const orderHistories = await OrderHistory.find();
    res.json(orderHistories);
  } catch (err) {
    console.error('Error fetching order histories:', err);
    res.status(500).json({ error: 'Failed to fetch order histories' });
  }
});

app.post('/order-history', async (req, res) => {
  const { poNumber, dateReceived, items } = req.body;
  const currentUser = req.headers['current-user'];
  const entryId = uuidv4();

  try {
    const itemHistoryReferences = [];
    for (const item of items) {
      const { itemId, quantityReceived } = item;
      const itemDoc = await Item.findOne({ itemid: itemId });
      if (itemDoc) {
        const currentDate = moment().utc().toISOString();
        const historyEntry = `${currentUser} +${quantityReceived} Received ${currentDate} (${entryId})`;
        itemDoc.history.push(historyEntry);
        await itemDoc.save();
        itemHistoryReferences.push(itemDoc._id);
      }
    }

    const newOrderHistory = new OrderHistory({ 
      entryId,
      poNumber, 
      dateReceived: moment(dateReceived).utc().toDate(), 
      items, 
      itemHistoryReferences 
    });
    await newOrderHistory.save();

    res.json(newOrderHistory);
  } catch (err) {
    console.error('Error creating order history:', err);
    res.status(500).json({ error: 'Failed to create order history' });
  }
});

app.put('/order-history/:id', async (req, res) => {
  const orderHistoryId = req.params.id;
  const { poNumber, dateReceived, items } = req.body;
  const currentUser = req.headers['current-user'];

  try {
    const existingOrderHistory = await OrderHistory.findById(orderHistoryId);
    if (!existingOrderHistory) {
      return res.status(404).json({ error: 'Order history not found' });
    }

    const existingItemsMap = new Map(existingOrderHistory.items.map(item => [item.itemId, item]));

    for (const newItem of items) {
      const itemDoc = await Item.findOne({ itemid: newItem.itemId });
      if (itemDoc) {
        const currentDate = moment().utc().toISOString();
        const existingItem = existingItemsMap.get(newItem.itemId);

        if (existingItem) {
          const oldEntryIndex = itemDoc.history.findIndex(entry => entry.includes(`(${existingOrderHistory.entryId})`));
          if (oldEntryIndex !== -1) {
            const newEntry = `${currentUser} +${newItem.quantityReceived} Received ${currentDate} (${existingOrderHistory.entryId})`;
            itemDoc.history[oldEntryIndex] = newEntry;
          }
        } else {
          const newEntry = `${currentUser} +${newItem.quantityReceived} Received ${currentDate} (${existingOrderHistory.entryId})`;
          itemDoc.history.push(newEntry);
        }

        await itemDoc.save();
      }
    }

    for (const oldItem of existingOrderHistory.items) {
      if (!items.some(item => item.itemId === oldItem.itemId)) {
        const itemDoc = await Item.findOne({ itemid: oldItem.itemId });
        if (itemDoc) {
          itemDoc.history = itemDoc.history.filter(entry => !entry.includes(`(${existingOrderHistory.entryId})`));
          await itemDoc.save();
        }
      }
    }

    existingOrderHistory.poNumber = poNumber;
    existingOrderHistory.dateReceived = moment(dateReceived).utc().toDate();
    existingOrderHistory.items = items;
    await existingOrderHistory.save();

    res.json(existingOrderHistory);
  } catch (err) {
    console.error('Error updating order history:', err);
    res.status(500).json({ error: 'Failed to update order history' });
  }
});

app.delete('/order-history/:id', async (req, res) => {
  const orderHistoryId = req.params.id;
  try {
    const orderHistory = await OrderHistory.findById(orderHistoryId);
    if (!orderHistory) {
      return res.status(404).json({ error: 'Order history not found' });
    }

    for (const item of orderHistory.items) {
      const itemDoc = await Item.findOne({ itemid: item.itemId });
      if (itemDoc) {
        itemDoc.history = itemDoc.history.filter(entry => !entry.includes(`(${orderHistory.entryId})`));
        await itemDoc.save();
      }
    }

    await OrderHistory.findByIdAndDelete(orderHistoryId);

    res.json({ message: 'Order history deleted successfully' });
  } catch (err) {
    console.error('Error deleting order history:', err);
    res.status(500).json({ error: 'Failed to delete order history' });
  }
});

const usehistorySchema = new mongoose.Schema({
  entryID: { type: String, unique: true, required: true },
  jobNumber: { type: String, required: true },
  dateUsed: { type: Date, required: true },
  items: [{
    itemId: { type: String, required: true },
    description: { type: String, required: true },
    quantityUsed: { type: Number, required: true }
  }],
  itemHistoryRefrences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }]
});

const UseHistory = mongoose.model('UseHistory', usehistorySchema);

app.get('/use-history', async (req, res) => {
  try {
    const useHistories = await UseHistory.find();
    res.json(useHistories);
  } catch (err) {
    console.error('Error fetching use histories:', err);
    res.status(500).json({ error: 'Failed to fetch use histories' });
  }
});

app.post('/use-history', async (req, res) => {
  const { jobNumber, dateUsed, items } = req.body;
  const currentUser = req.headers['current-user'];
  const entryID = uuidv4();

  try {
    const itemHistoryReferences = [];
    for (const item of items) {
      const { itemId, quantityUsed } = item;
      const itemDoc = await Item.findOne({ itemid: itemId });
      if (itemDoc) {
        const currentDate = moment().utc().toISOString();
        const historyEntry = `${currentUser} -${quantityUsed} Used ${currentDate} (${entryID})`;
        itemDoc.history.push(historyEntry);
        await itemDoc.save();
        itemHistoryReferences.push(itemDoc._id);
      }
    }

    const newUseHistory = new UseHistory({ 
      entryID,
      jobNumber, 
      dateUsed: moment(dateUsed).utc().toDate(), 
      items, 
      itemHistoryReferences 
    });
    await newUseHistory.save();

    res.json(newUseHistory);
  } catch (err) {
    console.error('Error creating use history:', err);
    res.status(500).json({ error: 'Failed to create use history' });
  }
});

app.put('/use-history/:id', async (req, res) => {
  const useHistoryId = req.params.id;
  const { jobNumber, dateUsed, items } = req.body;
  const currentUser = req.headers['current-user'];

  try {
    const existingUseHistory = await UseHistory.findById(useHistoryId);
    if (!existingUseHistory) {
      return res.status(404).json({ error: 'Use history not found' });
    }

    const existingItemsMap = new Map(existingUseHistory.items.map(item => [item.itemId, item]));

    for (const newItem of items) {
      const itemDoc = await Item.findOne({ itemid: newItem.itemId });
      if (itemDoc) {
        const currentDate = moment().utc().toISOString();
        const existingItem = existingItemsMap.get(newItem.itemId);

        if (existingItem) {
          const oldEntryIndex = itemDoc.history.findIndex(entry => entry.includes(`(${existingUseHistory.entryID})`));
          if (oldEntryIndex !== -1) {
            const newEntry = `${currentUser} -${newItem.quantityUsed} Used ${currentDate} (${existingUseHistory.entryID})`;
            itemDoc.history[oldEntryIndex] = newEntry;
          }
        } else {
          const newEntry = `${currentUser} -${newItem.quantityUsed} Used ${currentDate} (${existingUseHistory.entryID})`;
          itemDoc.history.push(newEntry);
        }

        await itemDoc.save();
      }
    }

    for (const oldItem of existingUseHistory.items) {
      if (!items.some(item => item.itemId === oldItem.itemId)) {
        const itemDoc = await Item.findOne({ itemid: oldItem.itemId });
        if (itemDoc) {
          itemDoc.history = itemDoc.history.filter(entry => !entry.includes(`(${existingUseHistory.entryID})`));
          await itemDoc.save();
        }
      }
    }

    existingUseHistory.jobNumber = jobNumber;
    existingUseHistory.dateUsed = moment(dateUsed).utc().toDate();
    existingUseHistory.items = items;
    await existingUseHistory.save();

    res.json(existingUseHistory);
  } catch (err) {
    console.error('Error updating use history:', err);
    res.status(500).json({ error: 'Failed to update use history' });
  }
});

app.delete('/use-history/:id', async (req, res) => {
  const useHistoryId = req.params.id;
  try {
    const useHistory = await UseHistory.findById(useHistoryId);
    if (!useHistory) {
      return res.status(404).json({ error: 'Use history not found' });
    }

    for (const item of useHistory.items) {
      const itemDoc = await Item.findOne({ itemid: item.itemId });
      if (itemDoc) {
        itemDoc.history = itemDoc.history.filter(entry => !entry.includes(`(${useHistory.entryID})`));
        await itemDoc.save();
      }
    }

    await UseHistory.findByIdAndDelete(useHistoryId);

    res.json({ message: 'Use history deleted successfully' });
  } catch (err) {
    console.error('Error deleting use history:', err);
    res.status(500).json({ error: 'Failed to delete use history' });
  }
});

app.get('/backup-and-reset', async (req, res) => {
  let backupPath;
  try {
    const workbook = new excel.Workbook();

    const itemsSheet = workbook.addWorksheet('Items');
    const items = await Item.find();
    if (items.length > 0) {
      itemsSheet.addRow(Object.keys(items[0].toObject()));
      items.forEach(item => {
        itemsSheet.addRow(Object.values(item.toObject()));
      });
    }

    const orderHistoriesSheet = workbook.addWorksheet('OrderHistories');
    const orderHistories = await OrderHistory.find();
    if (orderHistories.length > 0) {
      orderHistoriesSheet.addRow(Object.keys(orderHistories[0].toObject()));
      orderHistories.forEach(history => {
        orderHistoriesSheet.addRow(Object.values(history.toObject()));
      });
    }

    const requirementsSheet = workbook.addWorksheet('Requirements');
    const requirements = await Requirement.find();
    if (requirements.length > 0) {
      requirementsSheet.addRow(Object.keys(requirements[0].toObject()));
      requirements.forEach(requirement => {
        requirementsSheet.addRow(Object.values(requirement.toObject()));
      });
    }

    const useHistoriesSheet = workbook.addWorksheet('UseHistories');
    const useHistories = await UseHistory.find();
    if (useHistories.length > 0) {
      useHistoriesSheet.addRow(Object.keys(useHistories[0].toObject()));
      useHistories.forEach(history => {
        useHistoriesSheet.addRow(Object.values(history.toObject()));
      });
    }

    backupPath = path.join(__dirname, `backup_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(backupPath);

    await OrderHistory.deleteMany({});
    await UseHistory.deleteMany({});
    await Requirement.deleteMany({});
    await Item.updateMany({}, { $set: { history: [] } });

    res.download(backupPath, 'stockwise_backup.xlsx', (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).send('Error sending backup file');
        }
      }
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    });
  } catch (error) {
    console.error('Backup and reset error:', error);
    if (backupPath && fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to backup and reset data' });
    }
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../stockwise/public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});