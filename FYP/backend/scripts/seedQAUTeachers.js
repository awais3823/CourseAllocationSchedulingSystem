const dotenv = require('dotenv');
const connectDB = require('../config/database');
const User = require('../models/User');

dotenv.config();

// Default password for all seeded teachers (they can change after first login)
const DEFAULT_PASSWORD = 'Abcd@123';

const QAU_TEACHERS = [
  { name: 'Dr. Onaiza Maqbool', email: 'oniaza@qau.edu.pk' },
  { name: 'Dr. Ayyaz Hussain', email: 'ayyaz.hussain@qau.edu.pk' },
  { name: 'Dr. Muazzam A Khan Khattak', email: 'muazzam.khattak@qau.edu.pk' },
  { name: 'Dr. Rabeeh Ayaz Abbasi', email: 'rabbasi@qau.edu.pk' },
  { name: 'Dr. Muddassar Azam Sindhu', email: 'masindhu@qau.edu.pk' },
  { name: 'Dr. Ghazanfar Farooq Siddiqui', email: 'ghazanfar@qau.edu.pk' },
  { name: 'Dr. Khalid Saleem', email: 'ksaleem@qau.edu.pk' },
  { name: 'Dr. Umer Rasheed', email: 'umerrashid@qau.edu.pk' },
  { name: 'Dr. Akmal Saeed Khattak', email: 'akhattak@qau.edu.pk' },
  { name: 'Dr. Shuaib Karim', email: 'skarim@qau.edu.pk' },
  { name: 'Dr. S. M. Naqi', email: 'smnaqi@qau.edu.pk' },
  { name: 'Ms. Memoona Afsheen Malik', email: 'memoona@qau.edu.pk' },
  { name: 'Ms. Ifrah Farrukh Khan', email: 'ifrahkhan@qau.edu.pk' },
  { name: 'Dr. Muhammad Imran Khan', email: 'imran.khan@qau.edu.pk' },
  { name: 'Dr. Saima Akhtar', email: 'saima.akhtar@qau.edu.pk' },
  { name: 'Dr. Hassan Raza', email: 'hassan.raza@qau.edu.pk' },
  { name: 'Dr. Farah Mahmood', email: 'farah.mahmood@qau.edu.pk' },
  { name: 'Dr. Ali Ahmed', email: 'ali.ahmed@qau.edu.pk' },
  { name: 'Dr. Nadia Hussain', email: 'nadia.hussain@qau.edu.pk' },
  { name: 'Dr. Usman Malik', email: 'usman.malik@qau.edu.pk' },
  { name: 'Dr. Zainab Ali', email: 'zainab.ali@qau.edu.pk' },
  { name: 'Dr. Bilal Sheikh', email: 'bilal.sheikh@qau.edu.pk' },
  { name: 'Dr. Ayesha Khan', email: 'ayesha.khan@qau.edu.pk' }
];

const seedQAUTeachers = async () => {
  try {
    await connectDB();

    const usersToInsert = QAU_TEACHERS.map((t, i) => ({
      registrationNo: `T${String(i + 1).padStart(3, '0')}`,
      email: t.email.toLowerCase().trim(),
      // IMPORTANT: don't pre-hash; User model hashes on save
      password: DEFAULT_PASSWORD,
      name: t.name.trim(),
      role: 'teacher'
    }));

    // Skip teachers that already exist (same email or registrationNo)
    const inserted = [];
    const skipped = [];

    for (const user of usersToInsert) {
      const exists = await User.findOne({
        $or: [{ email: user.email }, { registrationNo: user.registrationNo }]
      });
      if (exists) {
        skipped.push(user.email);
        continue;
      }
      await User.create(user);
      inserted.push(user.email);
    }

    console.log(`\n✅ QAU teachers seed completed.`);
    console.log(`   Created: ${inserted.length}`);
    if (skipped.length > 0) {
      console.log(`   Skipped (already exist): ${skipped.length}`);
      skipped.forEach((e) => console.log(`      - ${e}`));
    }
    console.log(`\n   Default password for all new teachers: ${DEFAULT_PASSWORD}`);
    console.log('   They can change it after first login.\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding QAU teachers:', error);
    process.exit(1);
  }
};

seedQAUTeachers();
