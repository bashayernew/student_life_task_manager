import db from '../src/db.js';
import { getAssignableStaff, formatAssignableStaff } from '../src/utils/managerScope.js';
import { formatDepartmentsPayload } from '../src/utils/userDepartments.js';

const manager = db.prepare('SELECT * FROM users WHERE email = ?').get('manager@gmail.com');
console.log('Manager dept:', manager?.department_id);
const staff = getAssignableStaff(manager).map(formatAssignableStaff);
console.log('Assignable:', staff.map((s) => s.full_name));

const allStaff = db.prepare("SELECT * FROM users WHERE role = 'staff'").all().map(formatDepartmentsPayload);
console.log(allStaff.map((s) => ({ name: s.full_name, ids: s.department_ids, depts: s.departments?.map((d) => d.name) })));
