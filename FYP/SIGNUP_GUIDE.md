# Account Creation Guide - Sign Up Instructions

This guide provides detailed step-by-step instructions for creating Student, Teacher, and Admin accounts using the Sign Up page.

## 📋 Prerequisites

1. **Application Running**: Make sure both backend and frontend servers are running
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:3000`

2. **Access Sign Up Page**: Navigate to the Sign Up page
   - Click "Sign up" link on the Login page, OR
   - Go directly to: `http://localhost:3000/signup`

---

## 🎓 Creating a Student Account

### Step-by-Step Instructions:

1. **Registration Number**
   - **Field**: Registration Number
   - **Required**: Yes
   - **Format**: Any unique alphanumeric string
   - **Example**: `S004`, `2024-CS-123`, `STU-456`
   - **Note**: Must be unique (not already used by another user)

2. **Name**
   - **Field**: Name
   - **Required**: Yes
   - **Format**: Full name
   - **Example**: `Ahmed Khan`, `Fatima Ali`, `Hassan Ahmed`

3. **Email**
   - **Field**: Email
   - **Required**: Yes
   - **Format**: Valid email address
   - **Example**: `student4@university.edu`, `ahmed.khan@university.edu`
   - **Note**: Must be unique (not already registered)

4. **Password**
   - **Field**: Password
   - **Required**: Yes
   - **Minimum Length**: 6 characters
   - **Example**: `student123`, `securePass456`
   - **Tip**: Use the eye icon (👁️) to show/hide password while typing

5. **Role**
   - **Field**: Role (Dropdown)
   - **Required**: Yes
   - **Selection**: Select **"Student"** from the dropdown

6. **Semester** (Only appears when Role = Student)
   - **Field**: Semester
   - **Required**: Yes (for students only)
   - **Range**: 1 to 8
   - **Example**: `1`, `3`, `5`, `8`
   - **Note**: Enter a number between 1 and 8

7. **Program** (Only appears when Role = Student)
   - **Field**: Program
   - **Required**: Yes (for students only)
   - **Format**: Program name
   - **Example**: `Computer Science`, `Software Engineering`, `Information Technology`, `Data Science`

8. **Submit**
   - Click the **"Sign Up"** button
   - You will be automatically logged in and redirected to the dashboard

### Example Student Account:
```
Registration Number: S004
Name: Ahmed Khan
Email: ahmed.khan@university.edu
Password: student123
Role: Student
Semester: 3
Program: Computer Science
```

---

## 👨‍🏫 Creating a Teacher Account

### Step-by-Step Instructions:

1. **Registration Number**
   - **Field**: Registration Number
   - **Required**: Yes
   - **Format**: Any unique alphanumeric string
   - **Example**: `T004`, `TEACH-789`, `2024-T-456`
   - **Note**: Must be unique

2. **Name**
   - **Field**: Name
   - **Required**: Yes
   - **Format**: Full name (typically with title)
   - **Example**: `Dr. Ali Hassan`, `Prof. Sarah Ahmed`, `Dr. Muhammad Khan`

3. **Email**
   - **Field**: Email
   - **Required**: Yes
   - **Format**: Valid email address
   - **Example**: `teacher4@university.edu`, `ali.hassan@university.edu`
   - **Note**: Must be unique

4. **Password**
   - **Field**: Password
   - **Required**: Yes
   - **Minimum Length**: 6 characters
   - **Example**: `teacher123`, `securePass789`
   - **Tip**: Use the eye icon (👁️) to show/hide password

5. **Role**
   - **Field**: Role (Dropdown)
   - **Required**: Yes
   - **Selection**: Select **"Teacher"** from the dropdown

6. **Semester & Program**
   - **Not Required**: These fields will NOT appear when Teacher role is selected

7. **Submit**
   - Click the **"Sign Up"** button
   - You will be automatically logged in and redirected to the dashboard

### Example Teacher Account:
```
Registration Number: T004
Name: Dr. Ali Hassan
Email: ali.hassan@university.edu
Password: teacher123
Role: Teacher
```

---

## 👨‍💼 Creating an Admin Account

### Step-by-Step Instructions:

1. **Registration Number**
   - **Field**: Registration Number
   - **Required**: Yes
   - **Format**: Any unique alphanumeric string
   - **Example**: `ADMIN002`, `ADM-456`, `2024-ADMIN-001`
   - **Note**: Must be unique

2. **Name**
   - **Field**: Name
   - **Required**: Yes
   - **Format**: Full name
   - **Example**: `System Administrator`, `Admin User`, `John Admin`

3. **Email**
   - **Field**: Email
   - **Required**: Yes
   - **Format**: Valid email address
   - **Example**: `admin2@university.edu`, `admin.user@university.edu`
   - **Note**: Must be unique

4. **Password**
   - **Field**: Password
   - **Required**: Yes
   - **Minimum Length**: 6 characters
   - **Example**: `admin123`, `secureAdmin456`
   - **Tip**: Use the eye icon (👁️) to show/hide password

5. **Role**
   - **Field**: Role (Dropdown)
   - **Required**: Yes
   - **Selection**: Select **"Admin"** from the dropdown

6. **Semester & Program**
   - **Not Required**: These fields will NOT appear when Admin role is selected

7. **Submit**
   - Click the **"Sign Up"** button
   - You will be automatically logged in and redirected to the dashboard

### Example Admin Account:
```
Registration Number: ADMIN002
Name: System Administrator
Email: admin2@university.edu
Password: admin123
Role: Admin
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "User already exists with this email or registration number"
**Solution**: 
- Use a different email address
- Use a different registration number
- Both email and registration number must be unique

### Issue 2: "Semester is required for students"
**Solution**: 
- Make sure you selected "Student" as the role
- Enter a semester number between 1 and 8

### Issue 3: "Program is required for students"
**Solution**: 
- Make sure you selected "Student" as the role
- Enter a program name (e.g., "Computer Science")

### Issue 4: "Password must be at least 6 characters"
**Solution**: 
- Use a password with 6 or more characters
- Example: `pass123`, `secure123`, `mypassword`

### Issue 5: "Please provide a valid email"
**Solution**: 
- Make sure email format is correct
- Include @ symbol and domain (e.g., `user@university.edu`)

### Issue 6: Validation Errors Displayed
**Solution**: 
- Check all required fields are filled
- Ensure email format is correct
- Verify password meets minimum length requirement
- For students: ensure semester (1-8) and program are provided

---

## 🔐 Password Requirements

- **Minimum Length**: 6 characters
- **No Maximum**: Can be as long as you want
- **Characters Allowed**: Letters, numbers, and special characters
- **Examples**:
  - ✅ `password123`
  - ✅ `securePass!`
  - ✅ `123456`
  - ❌ `pass` (too short - less than 6 characters)

---

## 📝 Field Summary Table

| Field | Student | Teacher | Admin | Notes |
|-------|---------|---------|-------|-------|
| Registration Number | ✅ Required | ✅ Required | ✅ Required | Must be unique |
| Name | ✅ Required | ✅ Required | ✅ Required | Full name |
| Email | ✅ Required | ✅ Required | ✅ Required | Must be unique, valid format |
| Password | ✅ Required | ✅ Required | ✅ Required | Min 6 characters |
| Role | ✅ Required | ✅ Required | ✅ Required | Select from dropdown |
| Semester | ✅ Required | ❌ Not Required | ❌ Not Required | 1-8 (students only) |
| Program | ✅ Required | ❌ Not Required | ❌ Not Required | Text (students only) |

---

## ✅ After Sign Up

Once you successfully create an account:

1. **Automatic Login**: You will be automatically logged in
2. **Dashboard Redirect**: You'll be redirected to your role-specific dashboard
3. **Session**: Your session will be saved, so you stay logged in
4. **Logout**: You can logout anytime using the logout button

---

## 🔄 Already Have an Account?

If you already have an account, click the **"Login"** link at the bottom of the Sign Up page to go to the Login page instead.

---

## 📞 Need Help?

If you encounter any issues:
1. Check the error message displayed on the page
2. Verify all required fields are filled correctly
3. Ensure email and registration number are unique
4. Check that password meets minimum requirements
5. For students: verify semester and program are provided

---

**Last Updated**: December 2024
**Application**: Course Allocation and Scheduling System





