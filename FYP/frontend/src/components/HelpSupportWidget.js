import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const COMMON_HELP = [
  {
    keywords: ['login', 'signin', 'sign in', 'password'],
    answer: 'If login fails, verify email/password first. If still blocked, contact admin to verify your account status.'
  },
  {
    keywords: ['timetable', 'schedule'],
    answer: 'Use your role timetable page from sidebar. If no data appears, ask admin to generate/publish timetable.'
  },
  {
    keywords: ['exam', 'datesheet'],
    answer: 'Open Exam Schedule from sidebar. If empty, admin may not have generated the datesheet yet.'
  }
];

const ROLE_HELP = {
  admin: [
    {
      keywords: ['statistics', 'admin statistics'],
      answer: 'How to use Statistics: Open Admin > Statistics to view totals for users, courses, registrations, and system insights.'
    },
    {
      keywords: ['course management', 'manage courses', 'courses'],
      answer: 'How to manage courses: Open Admin > Course Management, then add/edit/delete courses with semester, credits, program, and registration dates.'
    },
    {
      keywords: ['marks', 'result'],
      answer: 'How to enter marks: 1) Open Admin > Marks Entry, 2) Select student, 3) Enter marks for each registration, 4) Click Save. Saving marks finalizes results and can update semester progression.'
    },
    {
      keywords: ['allocation', 'teacher'],
      answer: 'How to allocate course: 1) Open Admin > Course Allocation, 2) Select teacher, 3) Select one or more courses, 4) Click Allocate. This is required before teacher attendance/timetable workflows in ScheduliX.'
    },
    {
      keywords: ['classroom', 'classroom management'],
      answer: 'How to manage classrooms: Open Admin > Classroom Management to add/update rooms and capacities used in timetable/exam scheduling.'
    },
    {
      keywords: ['timetable management', 'generate timetable', 'admin timetable'],
      answer: 'How to generate timetable: Open Admin > Timetable Management, configure options if needed, then generate and review conflicts.'
    },
    {
      keywords: ['pending user', 'approve user', 'user management'],
      answer: 'How to manage users: 1) Open Admin > User Management, 2) Add/upload pending users, 3) Verify role and registration data, 4) Delete wrong entries if needed.'
    },
    {
      keywords: ['exam datesheet', 'generate datesheet'],
      answer: 'How to generate exam datesheet: 1) Open Admin > Exam Datesheet, 2) Choose source (Excel or Database), 3) Set start/end dates, 4) Generate and review conflicts.'
    },
    {
      keywords: ['overload', 'overload approvals'],
      answer: 'How to process overload requests: Open Admin > Overload Approvals, review pending requests, then approve or reject with decision.'
    }
  ],
  teacher: [
    {
      keywords: ['allocated courses', 'allocated course'],
      answer: 'How to use Allocated Courses: Open Teacher > Allocated Courses to view assigned subjects, semester, credits, and registered-student counts.'
    },
    {
      keywords: ['my timetable', 'teacher timetable'],
      answer: 'How to use My Timetable: Open Teacher > My Timetable to view your class schedule by day and time slots.'
    },
    {
      keywords: ['exam schedule', 'teacher exam schedule'],
      answer: 'How to use Exam Schedule: Open Teacher > Exam Schedule to view exam datesheet entries related to your assigned courses.'
    },
    {
      keywords: ['attendance', 'mark attendance'],
      answer: 'How to mark attendance: 1) Open Teacher > Mark Attendance, 2) Select course and session date, 3) Mark Present/Absent, 4) Click Save Attendance.'
    },
    {
      keywords: ['full attendance', 'sheet', 'excel'],
      answer: 'How to view full sheet: 1) Open Teacher > View Attendance, 2) Select subject/date, 3) Click Show Full Attendance. You will see Excel-style columns by date.'
    },
    {
      keywords: ['allocated', 'course details'],
      answer: 'How to check assigned courses: Open Teacher > Allocated Courses to view course code, name, semester, credits, program, and registered student count.'
    },
    {
      keywords: ['view attendance', 'date wise attendance'],
      answer: 'How to view date-wise attendance: 1) Open Teacher > View Attendance, 2) Select subject, 3) Pick date, 4) See Present/Absent list for that date.'
    },
    {
      keywords: ['teacher timetable', 'my timetable'],
      answer: 'How to use timetable: Open Teacher > My Timetable. Use this to track classes and confirm assigned teaching slots.'
    }
  ],
  student: [
    {
      keywords: ['my courses', 'student courses'],
      answer: 'How to use My Courses: Open Student > My Courses to view registered courses, dropped history, and waitlist entries.'
    },
    {
      keywords: ['register', 'course registration'],
      answer: 'How to register course: 1) Open Student > Register Courses, 2) Pick eligible course, 3) Click Register, 4) If over credit limit, request approval if prompted.'
    },
    {
      keywords: ['exam schedule', 'student exam schedule'],
      answer: 'How to view exam schedule: Open Student > Exam Schedule to see your exam datesheet entries.'
    },
    {
      keywords: ['my attendance', 'attendance'],
      answer: 'How to view attendance: Open Student > My Attendance, then choose your registered course to see summary and session-wise records.'
    },
    {
      keywords: ['cgpa', 'result'],
      answer: 'How to view results/CGPA: Open Student > My Results. Attendance is separate and shown in Student > My Attendance.'
    },
    {
      keywords: ['my courses', 'drop course'],
      answer: 'How to manage courses: Open Student > My Courses to view registered courses, waitlist, and drop active courses if allowed.'
    },
    {
      keywords: ['student timetable', 'my timetable'],
      answer: 'How to view class schedule: Open Student > My Timetable. Use it to track your day/slot based classes.'
    }
  ]
};

const HelpSupportWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState(
    'Select a quick question below to get instant help.'
  );

  const knowledgeBase = useMemo(() => {
    const role = user?.role || 'student';
    return [...COMMON_HELP, ...(ROLE_HELP[role] || [])];
  }, [user?.role]);

  const getBotReply = (question) => {
    const q = (question || '').toLowerCase();
    const match = knowledgeBase.find((item) =>
      item.keywords.some((k) => q.includes(k))
    );
    if (match) return match.answer;
    return 'I could not find an exact answer. Please include page name, role, and issue details so I can guide better.';
  };

  const roleQuickQuestions = useMemo(() => {
    const role = user?.role || 'student';
    if (role === 'admin') {
      return [
        'How to use Admin Statistics?',
        'How to use Course Management?',
        'How to allocate courses to teachers?',
        'How to use Classroom Management?',
        'How to use Timetable Management?',
        'How to use User Management?',
        'How to enter marks and finalize results?',
        'How to generate exam datesheet?',
        'How to use Overload Approvals?'
      ];
    }
    if (role === 'teacher') {
      return [
        'How to use Allocated Courses?',
        'How to use My Timetable?',
        'How to use Exam Schedule?',
        'How to mark attendance?',
        'How to view full attendance sheet?',
        'How to view date-wise attendance?'
      ];
    }
    return [
      'How to use My Courses?',
      'How to register courses?',
      'How to use Exam Schedule?',
      'How to view my attendance?',
      'How to check results and CGPA?',
      'How to view my timetable?'
    ];
  }, [user?.role]);

  if (!user || !['admin', 'teacher', 'student'].includes(user.role)) {
    return null;
  }

  return (
    <div className="help-widget-root">
      {isOpen && (
        <div className="help-widget-window">
          <div className="help-widget-header">
            <div className="help-widget-title">
              <span className="help-widget-qmark">?</span>
              <span>Help & Support</span>
            </div>
            <button className="help-widget-icon-btn" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="help-widget-body">
            <div className="help-quick-questions">
              {roleQuickQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`help-quick-btn ${selectedQuestion === q ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedQuestion(q);
                    setSelectedAnswer(getBotReply(q));
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="help-answer-panel">
              <div className="help-answer-title">
                {selectedQuestion || 'Quick Help'}
              </div>
              <div className="help-answer-text">{selectedAnswer}</div>
            </div>
          </div>
        </div>
      )}

      {!isOpen && (
        <button className="help-widget-fab" onClick={() => setIsOpen(true)}>
          <span className="help-widget-fab-qmark">?</span>
          <span>Help & Support</span>
        </button>
      )}
    </div>
  );
};

export default HelpSupportWidget;
