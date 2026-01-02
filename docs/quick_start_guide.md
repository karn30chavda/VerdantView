# VerdantView Migration: Quick Start Guide

## 🚀 Immediate Action Items

This guide will help you get started with the migration process TODAY. Follow these steps in order.

---

## Step 1: Set Up Accounts (30 minutes)

### 1.1 MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for free account
3. Create a new cluster (M0 Free tier)
4. Click "Connect" → "Connect your application"
5. Copy connection string (save for later)
6. Create database user with password
7. Whitelist your IP (0.0.0.0/0 for development)

**Connection String Format:**

```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/verdantview?retryWrites=true&w=majority
```

### 1.2 Razorpay Test Account

1. Go to [Razorpay](https://dashboard.razorpay.com/signup)
2. Sign up for account
3. Switch to "Test Mode" (top left)
4. Go to Settings → API Keys
5. Generate Test Keys
   - Key ID: `rzp_test_xxxxx`
   - Key Secret: `xxxxx`
6. Save these credentials

### 1.3 Backend Hosting (Railway)

1. Go to [Railway](https://railway.app/)
2. Sign up with GitHub
3. Create new project (we'll deploy later)

---

## Step 2: Create Backend Project (1 hour)

### 2.1 Initialize Backend Directory

```bash
# Navigate to your projects folder
cd C:\Users\Lenovo\Desktop\Projects

# Create backend folder
mkdir VerdantView-backend
cd VerdantView-backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express mongoose cors dotenv bcryptjs jsonwebtoken
npm install express-validator helmet morgan razorpay

# Install TypeScript dependencies
npm install -D typescript @types/node @types/express @types/cors
npm install -D @types/bcryptjs @types/jsonwebtoken ts-node nodemon

# Initialize TypeScript
npx tsc --init
```

### 2.2 Create Project Structure

```bash
# Create folders
mkdir src
mkdir src/config src/models src/routes src/controllers src/middleware src/utils

# Create files
type nul > src/server.ts
type nul > .env
type nul > .gitignore
```

### 2.3 Configure `.env`

Create `.env` file with:

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/verdantview?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:9002
```

### 2.4 Configure `package.json`

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest"
  }
}
```

### 2.5 Configure `tsconfig.json`

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 2.6 Create `.gitignore`

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

---

## Step 3: Implement Core Backend (2 hours)

### 3.1 Database Configuration

Create `src/config/database.ts`:

```typescript
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};
```

### 3.2 User Model

Create `src/models/User.ts`:

```typescript
import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  subscriptionStatus: "free" | "premium" | "expired";
  subscriptionId?: string;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  settings: {
    monthlyBudget: number;
    emergencyFundGoal: number;
    emergencyFundCurrent: number;
    userName: string;
    theme: "light" | "dark" | "system";
  };
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["free", "premium", "expired"],
      default: "free",
    },
    subscriptionId: String,
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    settings: {
      monthlyBudget: { type: Number, default: 1000 },
      emergencyFundGoal: { type: Number, default: 50000 },
      emergencyFundCurrent: { type: Number, default: 0 },
      userName: { type: String, default: "Friend" },
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
    },
    lastSyncAt: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
```

### 3.3 Expense Model

Create `src/models/Expense.ts`:

```typescript
import mongoose, { Document, Schema } from "mongoose";

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  paymentMode: string;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  syncedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    paymentMode: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    notes: String,
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
expenseSchema.index({ userId: 1, date: -1 });

export default mongoose.model<IExpense>("Expense", expenseSchema);
```

### 3.4 Auth Middleware

Create `src/middleware/auth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
  email: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.userId = decoded.userId;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};
```

### 3.5 Auth Routes

Create `src/routes/auth.routes.ts`:

```typescript
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      settings: {
        userName: name,
        monthlyBudget: 1000,
        emergencyFundGoal: 50000,
        emergencyFundCurrent: 0,
        theme: "system",
      },
    });

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        subscriptionStatus: user.subscriptionStatus,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Update last sync
    user.lastSyncAt = new Date();
    await user.save();

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        subscriptionStatus: user.subscriptionStatus,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
```

### 3.6 Expense Routes

Create `src/routes/expense.routes.ts`:

```typescript
import express from "express";
import Expense from "../models/Expense";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all expenses
router.get("/", async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query;

    const query: any = { userId: req.userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    if (type) query.type = type;
    if (category) query.category = category;

    const expenses = await Expense.find(query).sort({ date: -1 });

    res.json({ expenses });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create expense
router.post("/", async (req, res) => {
  try {
    const { title, amount, category, type, paymentMode, date, notes } =
      req.body;

    // Validation
    if (!title || !amount || !category || !type || !paymentMode || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const expense = await Expense.create({
      userId: req.userId,
      title,
      amount,
      category,
      type,
      paymentMode,
      date: new Date(date),
      notes,
    });

    res.status(201).json({ expense });
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update expense
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, type, paymentMode, date, notes } =
      req.body;

    const expense = await Expense.findOneAndUpdate(
      { _id: id, userId: req.userId },
      {
        title,
        amount,
        category,
        type,
        paymentMode,
        date,
        notes,
        syncedAt: new Date(),
      },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ expense });
  } catch (error) {
    console.error("Update expense error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete expense
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ message: "Expense deleted" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
```

### 3.7 Main Server File

Create `src/server.ts`:

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import authRoutes from "./routes/auth.routes";
import expenseRoutes from "./routes/expense.routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:9002",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});
```

---

## Step 4: Test Backend (30 minutes)

### 4.1 Start Backend Server

```bash
npm run dev
```

You should see:

```
✅ MongoDB Connected: cluster0-xxxxx.mongodb.net
🚀 Server running on http://localhost:3001
📝 Environment: development
```

### 4.2 Test with Postman/Thunder Client

**Test 1: Register**

```http
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

**Test 2: Login**

```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

Copy the `token` from response.

**Test 3: Create Expense**

```http
POST http://localhost:3001/api/expenses
Authorization: Bearer <your-token-here>
Content-Type: application/json

{
  "title": "Groceries",
  "amount": 500,
  "category": "Food",
  "type": "expense",
  "paymentMode": "UPI",
  "date": "2026-01-02T10:00:00Z"
}
```

**Test 4: Get Expenses**

```http
GET http://localhost:3001/api/expenses
Authorization: Bearer <your-token-here>
```

---

## Step 5: Update Frontend (1 hour)

### 5.1 Create API Client

Create `src/lib/api.ts` in your frontend:

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 5.2 Create Auth Context

Create `src/contexts/AuthContext.tsx`:

```typescript
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionStatus: "free" | "premium" | "expired";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isPremium: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch {
        localStorage.removeItem("authToken");
      }
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("authToken", data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const { data } = await api.post("/auth/register", {
      email,
      password,
      name,
    });
    localStorage.setItem("authToken", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isPremium: user?.subscriptionStatus === "premium",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
```

### 5.3 Update Root Layout

Update `src/app/layout.tsx`:

```typescript
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 5.4 Create Login Page

Create `src/app/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to VerdantView</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-100 text-red-600 p-3 rounded">{error}</div>
            )}

            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Step 6: Environment Variables

### 6.1 Create `.env.local` in Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## ✅ Verification Checklist

After completing these steps, verify:

- [ ] Backend server starts without errors
- [ ] MongoDB connection successful
- [ ] Can register new user via Postman
- [ ] Can login and receive JWT token
- [ ] Can create expense with auth token
- [ ] Can fetch expenses with auth token
- [ ] Frontend can connect to backend API
- [ ] Login page works
- [ ] Auth context provides user data

---

## 🎯 Next Steps

Once you've completed this quick start:

1. **Complete remaining models** (Category, Reminder, SavingsTransaction)
2. **Implement sync logic** in frontend
3. **Add Razorpay integration**
4. **Set up Capacitor**
5. **Deploy to production**

---

## 🆘 Troubleshooting

### MongoDB Connection Issues

- Check connection string format
- Verify IP whitelist (0.0.0.0/0 for testing)
- Ensure database user has correct permissions

### CORS Errors

- Verify `FRONTEND_URL` in backend `.env`
- Check CORS configuration in `server.ts`

### JWT Errors

- Ensure `JWT_SECRET` is set in `.env`
- Check token format in Authorization header

---

**Ready to start?** Begin with Step 1 and work your way through! 🚀
