import { RawRecord, ReconcileConfig, SampleDatasetId } from '../types/mis';

export const SAMPLE_DATASET_META: {
  id: SampleDatasetId;
  name: string;
  fileName: string;
  domain: string;
  description: string;
}[] = [
  {
    id: 'transactions',
    name: 'Fintech & Payment Transactions',
    fileName: 'I2_Fintech_MIS_Excel_Test.xlsx',
    domain: 'Fintech / Treasury',
    description:
      '48 transaction records with Success, Pending, and Failed business states plus intentional data errors (duplicate ID, missing amount, negative amount, invalid enum, mixed dates).',
  },
  {
    id: 'employees',
    name: 'HR Employee Roster & Payroll',
    fileName: 'HR_Employee_Operations_Q3.xlsx',
    domain: 'Human Resources',
    description:
      '45 employee records across Engineering, Sales, Operations, Finance & HR with Monthly Salary, Attendance %, Joining Date, Email, and Employment Status.',
  },
  {
    id: 'sales',
    name: 'B2B Regional Sales & Orders',
    fileName: 'Enterprise_Sales_Ledger_2026.xlsx',
    domain: 'Sales & Revenue',
    description:
      '46 B2B order records across North, West, South & East regions with Product Line, Units Sold, Order Revenue, and Order Status.',
  },
  {
    id: 'inventory',
    name: 'Warehouse Inventory & Stock Audit',
    fileName: 'Warehouse_Inventory_Audit.xlsx',
    domain: 'Supply Chain & Inventory',
    description:
      '44 SKU inventory records across Warehouse Zones with Unit Cost, Quantity On Hand, Stock Valuation, and Stock Status (In Stock, Low Stock, Out of Stock).',
  },
  {
    id: 'tickets',
    name: 'Support Tickets & SLA Tracker',
    fileName: 'Support_SLA_Operations_Log.xlsx',
    domain: 'Customer Support / IT Ops',
    description:
      '45 customer support tickets with Priority, Issue Category, Resolution Hours, CSAT %, and Ticket Status (Resolved, Open, Escalated).',
  },
];

export function getSampleDatasetById(datasetId: SampleDatasetId = 'transactions'): {
  fileName: string;
  rawRecords: RawRecord[];
} {
  if (datasetId === 'employees') {
    const rawRecords: RawRecord[] = [
      { 'Employee ID': 'EMP-1001', 'Employee Name': 'Aarav Sharma', 'Department': 'Engineering', 'Designation': 'Senior Backend Engineer', 'Joining Date': '12-01-2023', 'Monthly Salary': '115000', 'Attendance %': '98.5%', 'Location': 'Bengaluru', 'Email': 'aarav.sharma@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1002', 'Employee Name': 'Priya Nair', 'Department': 'Engineering', 'Designation': 'Frontend Architect', 'Joining Date': '15-03-2023', 'Monthly Salary': '₹1,28,000', 'Attendance %': '96.0%', 'Location': 'Bengaluru', 'Email': 'priya.nair@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1003', 'Employee Name': 'Rohan Deshmukh', 'Department': 'Sales', 'Designation': 'Enterprise Account Exec', 'Joining Date': '2024-02-10', 'Monthly Salary': '68000', 'Attendance %': '91.2%', 'Location': 'Mumbai', 'Email': 'rohan.d@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1004', 'Employee Name': 'Sneha Kulkarni', 'Department': 'Operations', 'Designation': 'MIS Operations Lead', 'Joining Date': '05-06-2022', 'Monthly Salary': '74000', 'Attendance %': '99.0%', 'Location': 'Pune', 'Email': 'sneha.k@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1005', 'Employee Name': 'Vikram Malhotra', 'Department': 'Finance', 'Designation': 'Financial Analyst', 'Joining Date': '18-07-2023', 'Monthly Salary': '82000', 'Attendance %': '94.5%', 'Location': 'Gurugram', 'Email': 'vikram.m@apexcorp.in', 'Status': 'On Leave' },
      { 'Employee ID': 'EMP-1006', 'Employee Name': 'Ananya Chatterjee', 'Department': 'HR', 'Designation': 'Talent Acquisition Partner', 'Joining Date': '01-11-2023', 'Monthly Salary': '58000', 'Attendance %': '97.0%', 'Location': 'Kolkata', 'Email': 'ananya.c@apexcorp.in', 'Status': 'Active' },
      // Duplicate Employee ID EMP-1006
      { 'Employee ID': 'EMP-1006', 'Employee Name': 'Ananya Chatterjee', 'Department': 'HR', 'Designation': 'Talent Acquisition Partner', 'Joining Date': '01-11-2023', 'Monthly Salary': '58000', 'Attendance %': '97.0%', 'Location': 'Kolkata', 'Email': 'ananya.c@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1007', 'Employee Name': 'Karthik Iyer', 'Department': 'Engineering', 'Designation': 'DevOps Specialist', 'Joining Date': '22-08-2023', 'Monthly Salary': '98000', 'Attendance %': '95.0%', 'Location': 'Chennai', 'Email': 'karthik.iyer@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1008', 'Employee Name': 'Meera Joshi', 'Department': 'Sales', 'Designation': 'Regional Sales Manager', 'Joining Date': '14-04-2021', 'Monthly Salary': '92000', 'Attendance %': '89.5%', 'Location': 'Mumbai', 'Email': 'meera.joshi@apexcorp.in', 'Status': 'Active' },
      // Missing Salary
      { 'Employee ID': 'EMP-1009', 'Employee Name': 'Siddharth Verma', 'Department': 'Operations', 'Designation': 'Supply Chain Coordinator', 'Joining Date': '09-09-2024', 'Monthly Salary': '', 'Attendance %': '92.0%', 'Location': 'Delhi', 'Email': 'siddharth.v@apexcorp.in', 'Status': 'Probation' },
      { 'Employee ID': 'EMP-1010', 'Employee Name': 'Neha Gupta', 'Department': 'Finance', 'Designation': 'Accounts Payable Exec', 'Joining Date': '19-01-2024', 'Monthly Salary': '61000', 'Attendance %': '96.8%', 'Location': 'Gurugram', 'Email': 'neha.gupta@apexcorp.in', 'Status': 'Active' },
      // Invalid Email
      { 'Employee ID': 'EMP-1011', 'Employee Name': 'Arjun Reddy', 'Department': 'Engineering', 'Designation': 'QA Automation Engineer', 'Joining Date': '03-05-2024', 'Monthly Salary': '76000', 'Attendance %': '94.0%', 'Location': 'Hyderabad', 'Email': 'arjun.reddy-at-apexcorp', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1012', 'Employee Name': 'Divya Menon', 'Department': 'HR', 'Designation': 'HR Business Partner', 'Joining Date': '11-10-2022', 'Monthly Salary': '69000', 'Attendance %': '98.0%', 'Location': 'Bengaluru', 'Email': 'divya.menon@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1013', 'Employee Name': 'Rahul Kapoor', 'Department': 'Sales', 'Designation': 'Inside Sales Representative', 'Joining Date': '25-06-2024', 'Monthly Salary': '46000', 'Attendance %': '84.0%', 'Location': 'Delhi', 'Email': 'rahul.kapoor@apexcorp.in', 'Status': 'Probation' },
      // Negative Salary error
      { 'Employee ID': 'EMP-1014', 'Employee Name': 'Pooja Tiwari', 'Department': 'Operations', 'Designation': 'Warehouse Auditor', 'Joining Date': '17-02-2023', 'Monthly Salary': '-52000', 'Attendance %': '91.0%', 'Location': 'Pune', 'Email': 'pooja.t@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1015', 'Employee Name': 'Aditya Rao', 'Department': 'Engineering', 'Designation': 'Principal Systems Engineer', 'Joining Date': '04-01-2021', 'Monthly Salary': '145000', 'Attendance %': '99.2%', 'Location': 'Bengaluru', 'Email': 'aditya.rao@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1016', 'Employee Name': 'Kavita Krishnan', 'Department': 'Finance', 'Designation': 'Taxation & Compliance Lead', 'Joining Date': '30-08-2022', 'Monthly Salary': '96000', 'Attendance %': '97.5%', 'Location': 'Chennai', 'Email': 'kavita.k@apexcorp.in', 'Status': 'Active' },
      // Invalid Date
      { 'Employee ID': 'EMP-1017', 'Employee Name': 'Manish Agarwal', 'Department': 'Sales', 'Designation': 'Channel Sales Executive', 'Joining Date': '31-02-2024', 'Monthly Salary': '54000', 'Attendance %': '88.0%', 'Location': 'Mumbai', 'Email': 'manish.a@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1018', 'Employee Name': 'Tanvi Bhatia', 'Department': 'Engineering', 'Designation': 'Data Engineer', 'Joining Date': '12-12-2023', 'Monthly Salary': '108000', 'Attendance %': '96.4%', 'Location': 'Hyderabad', 'Email': 'tanvi.b@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1019', 'Employee Name': 'Harshvardhan Singh', 'Department': 'Operations', 'Designation': 'Fleet Ops Supervisor', 'Joining Date': '08-03-2022', 'Monthly Salary': '63000', 'Attendance %': '78.5%', 'Location': 'Delhi', 'Email': 'harsh.singh@apexcorp.in', 'Status': 'Inactive' },
      { 'Employee ID': 'EMP-1020', 'Employee Name': 'Ritika Saxena', 'Department': 'HR', 'Designation': 'Payroll Specialist', 'Joining Date': '15-07-2023', 'Monthly Salary': '56000', 'Attendance %': '98.8%', 'Location': 'Gurugram', 'Email': 'ritika.s@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1021', 'Employee Name': 'Nikhil Hegde', 'Department': 'Engineering', 'Designation': 'Platform Security Engineer', 'Joining Date': '21-09-2023', 'Monthly Salary': '122000', 'Attendance %': '95.5%', 'Location': 'Bengaluru', 'Email': 'nikhil.h@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1022', 'Employee Name': 'Swati Choudhary', 'Department': 'Sales', 'Designation': 'Key Accounts Manager', 'Joining Date': '06-11-2022', 'Monthly Salary': '78000', 'Attendance %': '93.2%', 'Location': 'Mumbai', 'Email': 'swati.c@apexcorp.in', 'Status': 'On Leave' },
      { 'Employee ID': 'EMP-1023', 'Employee Name': 'Gaurav मिश्रा', 'Department': 'Operations', 'Designation': 'MIS Executive', 'Joining Date': '10-04-2024', 'Monthly Salary': '49000', 'Attendance %': '97.1%', 'Location': 'Pune', 'Email': 'gaurav.m@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1024', 'Employee Name': 'Shruti Kulkarni', 'Department': 'Finance', 'Designation': 'Internal Auditor', 'Joining Date': '19-05-2023', 'Monthly Salary': '79000', 'Attendance %': '96.0%', 'Location': 'Pune', 'Email': 'shruti.k@apexcorp.in', 'Status': 'Active' },
      { 'Employee ID': 'EMP-1025', 'Employee Name': 'Deepak Nambiar', 'Department': 'Engineering', 'Designation': 'Mobile Lead', 'Joining Date': '02-02-2022', 'Monthly Salary': '118000', 'Attendance %': '94.8%', 'Location': 'Bengaluru', 'Email': 'deepak.n@apexcorp.in', 'Status': 'Active' },
    ];
    return {
      fileName: 'HR_Employee_Operations_Q3.xlsx',
      rawRecords,
    };
  }

  if (datasetId === 'sales') {
    const rawRecords: RawRecord[] = [
      { 'Order ID': 'ORD-9001', 'Order Date': '20-09-2026', 'Customer Name': 'Reliance Retail Ltd', 'Region': 'West', 'Product Category': 'Industrial Sensors', 'Units Sold': '120', 'Order Revenue': '288000', 'Payment Mode': 'Bank', 'Order Status': 'Completed' },
      { 'Order ID': 'ORD-9002', 'Order Date': '20-09-2026', 'Customer Name': 'Tata Motors Pimpri', 'Region': 'West', 'Product Category': 'PLC Controllers', 'Units Sold': '45', 'Order Revenue': '405000', 'Payment Mode': 'Bank', 'Order Status': 'Completed' },
      { 'Order ID': 'ORD-9003', 'Order Date': '21-09-2026', 'Customer Name': 'Bharat Heavy Electricals', 'Region': 'North', 'Product Category': 'Switchgear Units', 'Units Sold': '80', 'Order Revenue': '192000', 'Payment Mode': 'Bank', 'Order Status': 'Processing' },
      { 'Order ID': 'ORD-9004', 'Order Date': '21-09-2026', 'Customer Name': 'TVS Supply Chain', 'Region': 'South', 'Product Category': 'Barcode Scanners', 'Units Sold': '200', 'Order Revenue': '310000', 'Payment Mode': 'UPI', 'Order Status': 'Completed' },
      // Duplicate Order ID
      { 'Order ID': 'ORD-9004', 'Order Date': '21-09-2026', 'Customer Name': 'TVS Supply Chain', 'Region': 'South', 'Product Category': 'Barcode Scanners', 'Units Sold': '200', 'Order Revenue': '310000', 'Payment Mode': 'UPI', 'Order Status': 'Completed' },
      { 'Order ID': 'ORD-9005', 'Order Date': '22-09-2026', 'Customer Name': 'Jindal Stainless Hisar', 'Region': 'North', 'Product Category': 'Thermal Relays', 'Units Sold': '150', 'Order Revenue': '165000', 'Payment Mode': 'Bank', 'Order Status': 'Completed' },
      { 'Order ID': 'ORD-9006', 'Order Date': '22-09-2026', 'Customer Name': 'ITC Packaging Division', 'Region': 'East', 'Product Category': 'Industrial Sensors', 'Units Sold': '95', 'Order Revenue': '228000', 'Payment Mode': 'Bank', 'Order Status': 'Cancelled' },
      // Missing Revenue
      { 'Order ID': 'ORD-9007', 'Order Date': '22-09-2026', 'Customer Name': 'Godrej & Boyce Mfg', 'Region': 'West', 'Product Category': 'Servo Drives', 'Units Sold': '30', 'Order Revenue': '', 'Payment Mode': 'Bank', 'Order Status': 'Pending' },
      { 'Order ID': 'ORD-9008', 'Order Date': '23-09-2026', 'Customer Name': 'Ashok Leyland Ennore', 'Region': 'South', 'Product Category': 'PLC Controllers', 'Units Sold': '60', 'Order Revenue': '540000', 'Payment Mode': 'Bank', 'Order Status': 'Completed' },
      { 'Order ID': 'ORD-9009', 'Order Date': '23-09-2026', 'Customer Name': 'Hero MotoCorp Dharuhera', 'Region': 'North', 'Product Category': 'Switchgear Units', 'Units Sold': '110', 'Order Revenue': '264000', 'Payment Mode': 'Bank', 'Order Status': 'Completed' },
      // Negative Order Revenue
      { 'Order ID': 'ORD-9010', 'Order Date': '23-09-2026', 'Customer Name': 'Berger Paints Kolkata', 'Region': 'East', 'Product Category': 'Thermal Relays', 'Units Sold': '40', 'Order Revenue': '-44000', 'Payment Mode': 'UPI', 'Order Status': 'Pending' },
      { 'Order ID': 'ORD-9011', 'Order Date': '24-09-2026', 'Customer Name': 'Kirloskar Brothers', 'Region': 'West', 'Product Category': 'Servo Drives', 'Units Sold': '50', 'Order Revenue': '375000', 'Payment Mode': 'Bank', 'Order Status': 'Completed' },
      { 'Order ID': 'ORD-9012', 'Order Date': '24-09-2026', 'Customer Name': 'Biocon Biologics', 'Region': 'South', 'Product Category': 'Industrial Sensors', 'Units Sold': '85', 'Order Revenue': '204000', 'Payment Mode': 'Bank', 'Order Status': 'Completed' },
      { 'Order ID': 'ORD-9013', 'Order Date': '25-09-2026', 'Customer Name': 'Havells India Noida', 'Region': 'North', 'Product Category': 'Barcode Scanners', 'Units Sold': '140', 'Order Revenue': '217000', 'Payment Mode': 'UPI', 'Order Status': 'Processing' },
      { 'Order ID': 'ORD-9014', 'Order Date': '25-09-2026', 'Customer Name': 'Tata Steel Jamshedpur', 'Region': 'East', 'Product Category': 'PLC Controllers', 'Units Sold': '70', 'Order Revenue': '630000', 'Payment Mode': 'Bank', 'Order Status': 'Completed' },
      { 'Order ID': 'ORD-9015', 'Order Date': '26-09-2026', 'Customer Name': 'Larsen & Toubro Hazira', 'Region': 'West', 'Product Category': 'Switchgear Units', 'Units Sold': '160', 'Order Revenue': '384000', 'Payment Mode': 'Bank', 'Order Status': 'Completed' },
      { 'Order ID': 'ORD-9016', 'Order Date': '26-09-2026', 'Customer Name': 'Bosch Automotive', 'Region': 'South', 'Product Category': 'Servo Drives', 'Units Sold': '45', 'Order Revenue': '337500', 'Payment Mode': 'Bank', 'Order Status': 'Completed' },
    ];
    return {
      fileName: 'Enterprise_Sales_Ledger_2026.xlsx',
      rawRecords,
    };
  }

  if (datasetId === 'inventory') {
    const rawRecords: RawRecord[] = [
      { 'SKU Code': 'SKU-401', 'Item Name': '3-Phase Induction Motor 5HP', 'Warehouse Zone': 'Zone A - Heavy', 'Last Restocked': '15-09-2026', 'Unit Cost': '14500', 'Quantity On Hand': '42', 'Stock Value': '609000', 'Status': 'In Stock' },
      { 'SKU Code': 'SKU-402', 'Item Name': 'Digital Pressure Transmitter', 'Warehouse Zone': 'Zone B - Electronics', 'Last Restocked': '18-09-2026', 'Unit Cost': '4800', 'Quantity On Hand': '85', 'Stock Value': '408000', 'Status': 'In Stock' },
      { 'SKU Code': 'SKU-403', 'Item Name': 'Hydraulic Solenoid Valve 24V', 'Warehouse Zone': 'Zone A - Heavy', 'Last Restocked': '19-09-2026', 'Unit Cost': '3200', 'Quantity On Hand': '8', 'Stock Value': '25600', 'Status': 'Low Stock' },
      { 'SKU Code': 'SKU-404', 'Item Name': 'Industrial Ethernet Switch 16P', 'Warehouse Zone': 'Zone B - Electronics', 'Last Restocked': '20-09-2026', 'Unit Cost': '9500', 'Quantity On Hand': '34', 'Stock Value': '323000', 'Status': 'In Stock' },
      // Duplicate SKU
      { 'SKU Code': 'SKU-404', 'Item Name': 'Industrial Ethernet Switch 16P', 'Warehouse Zone': 'Zone B - Electronics', 'Last Restocked': '20-09-2026', 'Unit Cost': '9500', 'Quantity On Hand': '34', 'Stock Value': '323000', 'Status': 'In Stock' },
      { 'SKU Code': 'SKU-405', 'Item Name': 'Pneumatic Air Cylinder 100mm', 'Warehouse Zone': 'Zone C - Assembly', 'Last Restocked': '21-09-2026', 'Unit Cost': '6100', 'Quantity On Hand': '0', 'Stock Value': '0', 'Status': 'Out of Stock' },
      { 'SKU Code': 'SKU-406', 'Item Name': 'Optical Proximity Sensor M18', 'Warehouse Zone': 'Zone B - Electronics', 'Last Restocked': '22-09-2026', 'Unit Cost': '1850', 'Quantity On Hand': '120', 'Stock Value': '222000', 'Status': 'In Stock' },
      // Negative Quantity Error
      { 'SKU Code': 'SKU-407', 'Item Name': 'Heavy Duty Contactor 63A', 'Warehouse Zone': 'Zone C - Assembly', 'Last Restocked': '22-09-2026', 'Unit Cost': '2900', 'Quantity On Hand': '-15', 'Stock Value': '-43500', 'Status': 'Low Stock' },
      { 'SKU Code': 'SKU-408', 'Item Name': 'Variable Frequency Drive 7.5kW', 'Warehouse Zone': 'Zone A - Heavy', 'Last Restocked': '23-09-2026', 'Unit Cost': '28000', 'Quantity On Hand': '19', 'Stock Value': '532000', 'Status': 'In Stock' },
      { 'SKU Code': 'SKU-409', 'Item Name': 'DIN Rail Power Supply 24VDC', 'Warehouse Zone': 'Zone B - Electronics', 'Last Restocked': '24-09-2026', 'Unit Cost': '2400', 'Quantity On Hand': '65', 'Stock Value': '156000', 'Status': 'In Stock' },
      // Missing Unit Cost
      { 'SKU Code': 'SKU-410', 'Item Name': 'Stainless Steel Ball Valve 2"', 'Warehouse Zone': 'Zone C - Assembly', 'Last Restocked': '25-09-2026', 'Unit Cost': '', 'Quantity On Hand': '40', 'Stock Value': '', 'Status': 'Low Stock' },
      { 'SKU Code': 'SKU-411', 'Item Name': 'Safety Light Curtain Pair', 'Warehouse Zone': 'Zone B - Electronics', 'Last Restocked': '26-09-2026', 'Unit Cost': '19500', 'Quantity On Hand': '14', 'Stock Value': '273000', 'Status': 'In Stock' },
    ];
    return {
      fileName: 'Warehouse_Inventory_Audit.xlsx',
      rawRecords,
    };
  }

  if (datasetId === 'tickets') {
    const rawRecords: RawRecord[] = [
      { 'Ticket ID': 'TKT-5001', 'Logged Date': '20-09-2026', 'Customer Account': 'HDFC Securities', 'Priority': 'High', 'Issue Category': 'API Latency', 'Assigned Engineer': 'Karthik Iyer', 'Resolution Hours': '3.5', 'CSAT %': '95%', 'Status': 'Resolved' },
      { 'Ticket ID': 'TKT-5002', 'Logged Date': '20-09-2026', 'Customer Account': 'ICICI Lombard', 'Priority': 'Medium', 'Issue Category': 'SSO Configuration', 'Assigned Engineer': 'Aarav Sharma', 'Resolution Hours': '5.0', 'CSAT %': '92%', 'Status': 'Closed' },
      { 'Ticket ID': 'TKT-5003', 'Logged Date': '21-09-2026', 'Customer Account': 'Kotak Mahindra Bank', 'Priority': 'Critical', 'Issue Category': 'Webhook Failure', 'Assigned Engineer': 'Nikhil Hegde', 'Resolution Hours': '1.8', 'CSAT %': '98%', 'Status': 'Resolved' },
      { 'Ticket ID': 'TKT-5004', 'Logged Date': '21-09-2026', 'Customer Account': 'Axis Direct', 'Priority': 'High', 'Issue Category': 'Report Export', 'Assigned Engineer': 'Priya Nair', 'Resolution Hours': '14.2', 'CSAT %': '78%', 'Status': 'Escalated' },
      // Duplicate Ticket ID
      { 'Ticket ID': 'TKT-5004', 'Logged Date': '21-09-2026', 'Customer Account': 'Axis Direct', 'Priority': 'High', 'Issue Category': 'Report Export', 'Assigned Engineer': 'Priya Nair', 'Resolution Hours': '14.2', 'CSAT %': '78%', 'Status': 'Escalated' },
      { 'Ticket ID': 'TKT-5005', 'Logged Date': '22-09-2026', 'Customer Account': 'Bajaj Finserv', 'Priority': 'Low', 'Issue Category': 'User Provisioning', 'Assigned Engineer': 'Tanvi Bhatia', 'Resolution Hours': '2.4', 'CSAT %': '96%', 'Status': 'Resolved' },
      { 'Ticket ID': 'TKT-5006', 'Logged Date': '23-09-2026', 'Customer Account': 'SBI Cards', 'Priority': 'Critical', 'Issue Category': 'Database Sync', 'Assigned Engineer': 'Aditya Rao', 'Resolution Hours': '8.5', 'CSAT %': '85%', 'Status': 'Open' },
      // Missing Resolution Hours
      { 'Ticket ID': 'TKT-5007', 'Logged Date': '24-09-2026', 'Customer Account': 'Zerodha Broking', 'Priority': 'Medium', 'Issue Category': 'API Latency', 'Assigned Engineer': '', 'Resolution Hours': '', 'CSAT %': '', 'Status': 'Open' },
      { 'Ticket ID': 'TKT-5008', 'Logged Date': '25-09-2026', 'Customer Account': 'Groww Invest', 'Priority': 'High', 'Issue Category': 'Webhook Failure', 'Assigned Engineer': 'Karthik Iyer', 'Resolution Hours': '4.1', 'CSAT %': '94%', 'Status': 'Resolved' },
      { 'Ticket ID': 'TKT-5009', 'Logged Date': '26-09-2026', 'Customer Account': 'PhonePe Merchant', 'Priority': 'Medium', 'Issue Category': 'Report Export', 'Assigned Engineer': 'Priya Nair', 'Resolution Hours': '3.0', 'CSAT %': '97%', 'Status': 'Resolved' },
    ];
    return {
      fileName: 'Support_SLA_Operations_Log.xlsx',
      rawRecords,
    };
  }

  // Default Dataset 1: Fintech / Transactions Dataset (48 rows matching I2_Fintech_MIS_Excel_Test.xlsx structure)
  const rawRecords: RawRecord[] = [
    // Valid Success rows -> Data Validation = VALID, Status Check = OK
    { Date: '20-09-2026', 'Transaction ID': 'TXN1001', 'Customer/Party Name': 'ABC Traders', Type: 'Credit', Amount: '5000', Mode: 'UPI', Status: 'Success', Remarks: 'Payment received' },
    { Date: '2026-09-20', 'Transaction ID': 'TXN1002', 'Customer/Party Name': 'Reliance Retail Distribution', Type: 'Credit', Amount: '₹1,25,000', Mode: 'Bank', Status: 'Success', Remarks: 'Customer order collection batch' },
    // Valid Pending row -> Data Validation = VALID, Status Check = Review Needed
    { Date: '20-09-2026', 'Transaction ID': 'TXN1003', 'Customer/Party Name': 'Mehta Industrial Supplies', Type: 'Credit', Amount: '1500', Mode: 'Cash', Status: 'Pending', Remarks: 'Counter cash verification pending' },
    // Intentional Duplicate Transaction ID TXN1004
    { Date: '20-09-2026', 'Transaction ID': 'TXN1004', 'Customer/Party Name': 'Kulkarni & Sons Hardware', Type: 'Credit', Amount: '32000', Mode: 'UPI', Status: 'Success', Remarks: 'Advance retainer against PO #8841' },
    { Date: '20-09-2026', 'Transaction ID': 'TXN1004', 'Customer/Party Name': 'Kulkarni & Sons Hardware', Type: 'Credit', Amount: '32000', Mode: 'UPI', Status: 'Success', Remarks: 'Duplicate webhook retry entry' },
    // Valid Failed row -> Data Validation = VALID, Status Check = Review Needed
    { Date: '20-09-2026', 'Transaction ID': 'TXN1005', 'Customer/Party Name': 'Bharat Electronics Corp', Type: 'Debit', Amount: '1800', Mode: 'Cash', Status: 'Failed', Remarks: 'Voucher declined by cashier' },
    { Date: '20-09-2026', 'Transaction ID': 'TXN1006', 'Customer/Party Name': 'Vardhman Textiles Ltd', Type: 'Credit', Amount: '67500', Mode: 'Bank', Status: 'Success', Remarks: 'Invoice #VT-402 settled' },
    { Date: '20-09-2026', 'Transaction ID': 'TXN1007', 'Customer/Party Name': 'Shree Cement Traders', Type: 'Debit', Amount: '14500', Mode: 'Cash', Status: 'Success', Remarks: 'Site material unload charges' },
    // Intentional Missing Customer Name
    { Date: '20-09-2026', 'Transaction ID': 'TXN1008', 'Customer/Party Name': '   ', Type: 'Credit', Amount: '21800', Mode: 'UPI', Status: 'Success', Remarks: 'Unidentified counter UPI collection' },

    // Day 2: 21-09-2026
    { Date: '21-09-2026', 'Transaction ID': 'TXN1009', 'Customer/Party Name': 'Zomato Merchant Settlement', Type: 'Credit', Amount: '94300', Mode: 'Bank', Status: 'Success', Remarks: 'UPI QR merchant settlement batch' },
    { Date: '21/09/2026', 'Transaction ID': '  txn1010  ', 'Customer/Party Name': '  Tata Communications Enterprise  ', Type: 'Debit', Amount: '56000', Mode: 'Bank', Status: '  Success ', Remarks: 'Leased line quarterly billing' },
    { Date: '21-09-2026', 'Transaction ID': 'TXN1011', 'Customer/Party Name': 'BlueDart Express Freight', Type: 'Debit', Amount: '28900', Mode: 'UPI', Status: 'Failed', Remarks: 'UPI daily limit exceeded error' },
    { Date: '21-09-2026', 'Transaction ID': 'TXN1012', 'Customer/Party Name': 'Kirloskar Pneumatic Co', Type: 'Credit', Amount: '142000', Mode: 'Bank', Status: 'Success', Remarks: 'Compressor unit supply invoice' },
    // Intentional Invalid Date
    { Date: '32-09-2026', 'Transaction ID': 'TXN1013', 'Customer/Party Name': 'Godrej Interio Commercial', Type: 'Debit', Amount: '39500', Mode: 'Bank', Status: 'Success', Remarks: 'Office ergonomic seating batch' },
    { Date: '21-09-2026', 'Transaction ID': 'TXN1014', 'Customer/Party Name': 'Mahindra Agri Solutions', Type: 'Credit', Amount: '76400', Mode: 'UPI', Status: 'Success', Remarks: 'Regional distributor collection' },
    { Date: '21-09-2026', 'Transaction ID': 'TXN1015', 'Customer/Party Name': 'Havells Electricals Hub', Type: 'Debit', Amount: '43200', Mode: 'Bank', Status: 'Success', Remarks: 'Industrial switchgear purchase' },
    // Intentional Negative Amount
    { Date: '21-09-2026', 'Transaction ID': 'TXN1016', 'Customer/Party Name': 'Crompton Greaves Consumer', Type: 'Debit', Amount: '-18500', Mode: 'Bank', Status: 'Pending', Remarks: 'Negative amount entry error' },
    { Date: '21-09-2026', 'Transaction ID': 'TXN1017', 'Customer/Party Name': 'Asian Paints Dealer Portal', Type: 'Credit', Amount: '112000', Mode: 'Bank', Status: 'Success', Remarks: 'Dealer invoice clearance' },

    // Day 3: 22-09-2026
    { Date: '22-09-2026', 'Transaction ID': 'TXN1018', 'Customer/Party Name': 'Pidilite Industries Direct', Type: 'Debit', Amount: '27600', Mode: 'UPI', Status: 'Success', Remarks: 'Adhesive drum batch procurement' },
    // Intentional Duplicate ID TXN1019
    { Date: '22-09-2026', 'Transaction ID': 'TXN1019', 'Customer/Party Name': 'Larsen & Toubro Infra', Type: 'Credit', Amount: '185000', Mode: 'Bank', Status: 'Success', Remarks: 'Milestone 2 civil contract receipt' },
    { Date: '22-09-2026', 'Transaction ID': 'TXN1019', 'Customer/Party Name': 'Larsen & Toubro Infra', Type: 'Credit', Amount: '185000', Mode: 'Bank', Status: 'Success', Remarks: 'Duplicate import from sheet tab 2' },
    { Date: '22-09-2026', 'Transaction ID': 'TXN1020', 'Customer/Party Name': 'Delhivery Surface Ops', Type: 'Debit', Amount: '34800', Mode: 'Bank', Status: 'Pending', Remarks: 'Linehaul logistics settlement' },
    { Date: '22-09-2026', 'Transaction ID': 'TXN1021', 'Customer/Party Name': 'Swiggy Instamart Payout', Type: 'Credit', Amount: '88900', Mode: 'Bank', Status: 'Success', Remarks: 'Weekly FMCG fulfillment payout' },
    // Intentional Missing Amount
    { Date: '22-09-2026', 'Transaction ID': 'TXN1022', 'Customer/Party Name': 'Apex Logistics Pvt Ltd', Type: 'Debit', Amount: '', Mode: 'Cash', Status: 'Pending', Remarks: 'Unbilled detention voucher - amount blank' },
    { Date: '2026/09/22', 'Transaction ID': 'TXN1023', 'Customer/Party Name': 'Mehta Industrial Supplies', Type: 'Credit', Amount: '53400', Mode: 'UPI', Status: 'Success', Remarks: 'Credit note settlement receipt' },
    { Date: '22-09-2026', 'Transaction ID': 'TXN1024', 'Customer/Party Name': 'Reliance Retail Distribution', Type: 'Credit', Amount: '164000', Mode: 'Bank', Status: 'Success', Remarks: 'Key account invoice #RR-902' },
    { Date: '22-09-2026', 'Transaction ID': 'TXN1025', 'Customer/Party Name': 'Kulkarni & Sons Hardware', Type: 'Debit', Amount: '12300', Mode: 'Cash', Status: 'Success', Remarks: 'Fasteners & tool consumables' },

    // Day 4: 23-09-2026
    { Date: '23-09-2026', 'Transaction ID': 'TXN1026', 'Customer/Party Name': 'Bharat Electronics Corp', Type: 'Credit', Amount: '138500', Mode: 'Bank', Status: 'Success', Remarks: 'Defense PSU vendor settlement' },
    { Date: '23-09-2026', 'Transaction ID': 'TXN1027', 'Customer/Party Name': 'Vardhman Textiles Ltd', Type: 'Debit', Amount: '61200', Mode: 'Bank', Status: 'Failed', Remarks: 'IFSC code mismatch - returned by bank' },
    // Intentional Invalid Mode & Invalid Status
    { Date: '23-09-2026', 'Transaction ID': 'TXN1028', 'Customer/Party Name': 'Shree Cement Traders', Type: 'Debit', Amount: '47000', Mode: 'CryptoWallet', Status: 'UnknownStatus', Remarks: 'Invalid Mode & Invalid Status test row' },
    { Date: '23-09-2026', 'Transaction ID': 'TXN1029', 'Customer/Party Name': 'Zomato Merchant Settlement', Type: 'Credit', Amount: '79200', Mode: 'UPI', Status: 'Success', Remarks: 'Mid-week merchant payout' },
    { Date: '23-09-2026', 'Transaction ID': 'TXN1030', 'Customer/Party Name': 'Tata Communications Enterprise', Type: 'Debit', Amount: '41000', Mode: 'Bank', Status: 'Success', Remarks: 'Cloud SIP trunking charges' },
    { Date: '23-09-2026', 'Transaction ID': 'TXN1031', 'Customer/Party Name': 'BlueDart Express Freight', Type: 'Debit', Amount: '28900', Mode: 'Bank', Status: 'Success', Remarks: 'Re-initiated after previous UPI failure' },
    // Intentional Missing Transaction ID
    { Date: '23-09-2026', 'Transaction ID': '', 'Customer/Party Name': 'Kirloskar Pneumatic Co', Type: 'Credit', Amount: '36500', Mode: 'Cash', Status: 'Success', Remarks: 'Manual cash receipt voucher missing Ref ID' },

    // Day 5: 24-09-2026
    { Date: '24-09-2026', 'Transaction ID': 'TXN1033', 'Customer/Party Name': 'Godrej Interio Commercial', Type: 'Credit', Amount: '92000', Mode: 'Bank', Status: 'Success', Remarks: 'Corporate fitout milestone billing' },
    { Date: '24-09-2026', 'Transaction ID': 'TXN1034', 'Customer/Party Name': 'Mahindra Agri Solutions', Type: 'Credit', Amount: '118000', Mode: 'Bank', Status: 'Success', Remarks: 'Seasonal procurement settlement' },
    { Date: '24-09-2026', 'Transaction ID': 'TXN1035', 'Customer/Party Name': 'Havells Electricals Hub', Type: 'Debit', Amount: '52400', Mode: 'UPI', Status: 'Success', Remarks: 'Cable & luminaire dispatch' },
    { Date: '24-09-2026', 'Transaction ID': 'TXN1036', 'Customer/Party Name': 'Crompton Greaves Consumer', Type: 'Credit', Amount: '64800', Mode: 'Bank', Status: 'Pending', Remarks: 'RTGS settlement under clearing' },
    { Date: '24-09-2026', 'Transaction ID': 'TXN1037', 'Customer/Party Name': 'Asian Paints Dealer Portal', Type: 'Credit', Amount: '149500', Mode: 'Bank', Status: 'Success', Remarks: 'Regional depot collection' },
    { Date: '24-09-2026', 'Transaction ID': 'TXN1038', 'Customer/Party Name': 'Pidilite Industries Direct', Type: 'Debit', Amount: '31200', Mode: 'UPI', Status: 'Success', Remarks: 'Waterproofing chemical lot' },
    // Intentional Invalid Type
    { Date: '24-09-2026', 'Transaction ID': 'TXN1039', 'Customer/Party Name': 'Larsen & Toubro Infra', Type: 'InvalidType', Amount: '75000', Mode: 'Bank', Status: 'Success', Remarks: 'Unclassified entry type error' },

    // Day 6 & 7: 25-09-2026 & 26-09-2026
    { Date: '25-09-2026', 'Transaction ID': 'TXN1040', 'Customer/Party Name': 'Delhivery Surface Ops', Type: 'Debit', Amount: '44600', Mode: 'Bank', Status: 'Success', Remarks: 'North zone fulfillment charges' },
    { Date: '25-09-2026', 'Transaction ID': 'TXN1041', 'Customer/Party Name': 'Swiggy Instamart Payout', Type: 'Credit', Amount: '103400', Mode: 'Bank', Status: 'Success', Remarks: 'Dark store order settlement' },
    { Date: '25-09-2026', 'Transaction ID': 'TXN1042', 'Customer/Party Name': 'Apex Logistics Pvt Ltd', Type: 'Debit', Amount: '58900', Mode: 'Bank', Status: 'Success', Remarks: 'Cold chain fleet lease' },
    { Date: '26-09-2026', 'Transaction ID': 'TXN1043', 'Customer/Party Name': 'Mehta Industrial Supplies', Type: 'Debit', Amount: '22100', Mode: 'Cash', Status: 'Success', Remarks: 'Emergency workshop spares' },
    { Date: '26-09-2026', 'Transaction ID': 'TXN1044', 'Customer/Party Name': 'Reliance Retail Distribution', Type: 'Credit', Amount: '195000', Mode: 'Bank', Status: 'Success', Remarks: 'Modern trade monthly payout' },
    { Date: '26-09-2026', 'Transaction ID': 'TXN1045', 'Customer/Party Name': 'Kulkarni & Sons Hardware', Type: 'Credit', Amount: '41500', Mode: 'UPI', Status: 'Failed', Remarks: 'Customer bank server timeout' },
    { Date: '26-09-2026', 'Transaction ID': 'TXN1046', 'Customer/Party Name': 'Bharat Electronics Corp', Type: 'Credit', Amount: '129000', Mode: 'Bank', Status: 'Success', Remarks: 'Sub-assembly supply invoice' },
  ];

  return {
    fileName: 'I2_Fintech_MIS_Excel_Test.xlsx',
    rawRecords,
  };
}

export function generateUniversalSampleReconciliation(): {
  fileAName: string;
  fileBName: string;
  fileARecords: RawRecord[];
  fileBRecords: RawRecord[];
  config: ReconcileConfig;
} {
  const base = getSampleDatasetById('transactions').rawRecords;
  const fileARecords: RawRecord[] = [];
  const fileBRecords: RawRecord[] = [];

  for (const row of base) {
    const id = String(row['Transaction ID'] ?? '').trim().toUpperCase();
    if (!id) continue;
    const rawAmt = String(row['Amount'] ?? '').replace(/[₹,\s]/g, '');
    const amt = Number(rawAmt);
    if (!Number.isFinite(amt) || amt <= 0) continue;

    const date = String(row['Date'] ?? '').trim();
    const party = String(row['Customer/Party Name'] ?? '').trim() || 'Counterparty';
    const status = String(row['Status'] ?? '').trim();

    if (id !== 'TXN1045' && id !== 'TXN1046') {
      fileARecords.push({
        'Reference ID': id,
        'Date': date,
        'Amount': amt,
        'Status': status,
        'Party Name': party,
      });
    }

    if (['TXN1005', 'TXN1011', 'TXN1027'].includes(id)) {
      continue; // Missing in File B (Bank statement)
    }

    if (id === 'TXN1019' && fileBRecords.some((r) => r['Reference ID'] === 'TXN1019')) {
      continue;
    }

    let bankAmt = amt;
    if (id === 'TXN1003') bankAmt = amt - 150;
    if (id === 'TXN1020') bankAmt = amt - 1200;
    if (id === 'TXN1036') bankAmt = amt + 400;

    fileBRecords.push({
      'Reference ID': id,
      'Value Date': date,
      'Settled Amount': bankAmt,
      'Bank Status': 'Cleared',
      'Narration': party,
    });
  }

  fileBRecords.push({
    'Reference ID': 'BNK-FEE-9901',
    'Value Date': '26-09-2026',
    'Settled Amount': 1180,
    'Bank Status': 'Cleared',
    'Narration': 'Corporate CMS Quarterly Bank Fee',
  });

  return {
    fileAName: 'File_A_Internal_Ledger.xlsx',
    fileBName: 'File_B_External_Bank_Statement.xlsx',
    fileARecords,
    fileBRecords,
    config: {
      keyColumnA: 'Reference ID',
      keyColumnB: 'Reference ID',
      valueColumnA: 'Amount',
      valueColumnB: 'Settled Amount',
      dateColumnA: 'Date',
      dateColumnB: 'Value Date',
      statusColumnA: 'Status',
      statusColumnB: 'Bank Status',
      labelColumnA: 'Party Name',
      labelColumnB: 'Narration',
    },
  };
}
