const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Reminder = require("../models/reminder");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const saltRounds = 10;
const salt = bcrypt.genSaltSync(saltRounds);
const secretKey = "my_secret_key";

const getUsers = function (users) {
  const usersArray = users.map((user) => user.toObject());
  return usersArray;
};

router.post("/user", (req, res) => {
  const user = new User(req.body);
  console.log(user);
  User.find({}).then((users, err) => {
    if (err) {
      res.status(500).send(err);
    } else {
      const usersArray = getUsers(users);
      console.log(usersArray);
      console.log(user.email);
      if (existUser(usersArray, user.email) || user.userName === "") {
        return res.status(401).send(`invalid username '${user.userName}'`);
      } else {
        const hashedPassword = bcrypt.hashSync(user.password, salt);
        user.password = hashedPassword;
        const savedUser = user.save();
        return res.status(201).json(savedUser);
      }
    }
  });
});

function authenticateUser(email, password) {
  return User.find({}).then((users, err) => {
    const usersArray = getUsers(users);
    const user = usersArray.find((u) => u.email === email);
    if (!user) {
      return null;
    }
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    console.log(isPasswordValid);
    if (!isPasswordValid) {
      return null;
    }
    return { email: user.email };
  });
}

function generateAccessToken(user) {
  return jwt.sign(user, secretKey);
}

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = authenticateUser(email, password);
  user.then((user) => {
    if (!user) {
      return res.status(401).send({ message: "Invalid username or password" });
    }
    const accessToken = generateAccessToken(user);
    res.send({ accessToken });
  });
});

router.get("/reminders/:email", function (req, res) {
  let userEmail = req.params.email;
  Reminder.find({ userEmail: userEmail })
    .exec()
    .then((reminders) => {
      res.send(reminders);
    })
    .catch((error) => {
      res.status(500).send("Error retrieving reminders");
    });
});


const existUser = function (usersArray, email) {
  let flag = false;
  const findUser = usersArray.find((user) => {
    if (user.email === email) {
      flag = true;
    }
  });

  return flag;
};

router.get("/users", (req, res) => {
  return User.find({}).then((users) => {
    return res.status(201).json(users);
  });
});

router.get("/allReminders", (req, res) => {
  return Reminder.find({}).then((reminders) => {
    return res.status(201).json(reminders);
  });
});

router.post("/reminder", function (req, res) {
  const reminder = req.body;
  let newReminder = new Reminder({
    reminderName: reminder.reminderName,
    reminderDescription: reminder.reminderDescription,
    executionDate: reminder.reminderDate,
    userEmail: reminder.reminderEmail,
    isCompleted:false
  });
  newReminder.save();
  res.send({newReminder})
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(401);
    }
    req.user = user;
    next();
  });
}

router.get("/currentUser", authenticateToken, (req, res) => {
  res.json({
    user: req.user,
  });
});

router.put('/completedReminder/:id', async (req, res) => {
  const reminderId = req.params.id;

  try {
    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    reminder.isCompleted = true;
    await reminder.save();

    return res.json({ message: 'Reminder updated to completed' });
  } catch (error) {
    console.error('Failed to update reminder:', error);
    return res.status(500).json({ error: 'Failed to update reminder' });
  }
});






module.exports = router;
