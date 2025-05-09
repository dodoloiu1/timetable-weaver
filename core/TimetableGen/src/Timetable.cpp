#include "timetable.hpp"

namespace TimetableWeaver
{

/**
 * Availability
 */
Availability::Availability(int days, int periods)
    : m_Days(days), m_PeriodsPerDay(periods)
{
  assert(days >= 1 && days <= 7);
  assert(periods >= 1 && periods <= 32);

  m_Buffer.resize(m_Days, 0);
}

void Availability::Set(int day, int period, bool val)
{
  assert(day >= 0 && day < m_Days);
  assert(period >= 0 && period < m_PeriodsPerDay);

  unsigned int mask = 1 << period;
  if (val) {
    m_Buffer[day] |= mask;
  } else {
    m_Buffer[day] &= ~mask;
  }
}

void Availability::SetDay(int day, bool val)
{
  assert(day >= 0 && day < m_Days);

  if (val) {
    m_Buffer[day] = (1 << m_PeriodsPerDay) - 1;
  } else {
    m_Buffer[day] = 0;
  }
}

void Availability::ToggleDay(int day)
{
  assert(day >= 0 && day < m_Days);

  int mask = (1 << m_PeriodsPerDay) - 1;
  m_Buffer[day] ^= mask;
}

void Availability::Toggle(int day, int period)
{
  assert(day >= 0 && day < m_Days);
  assert(period >= 0 && period < m_PeriodsPerDay);

  unsigned int mask = 1 << period;
  m_Buffer[day] ^= mask;
}

bool Availability::Get(int day, int period) const
{
  assert(day >= 0 && day < m_Days);
  assert(period >= 0 && period < m_PeriodsPerDay);

  unsigned int mask = 1 << period;
  return (m_Buffer[day] & mask) != 0;
}

uint32_t Availability::GetDay(int day) const
{
  assert(day >= 0 && day < m_Days);
  return m_Buffer[day];
}

void Availability::Print(std::ostream &stream) const
{
  for (int day = 0; day < m_Days; day++) {
    stream << "Day " << day << ": ";
    for (int period = 0; period < m_PeriodsPerDay; period++) {
      bool isAvailable = Get(day, period);
      stream << isAvailable << ' ';
    }
    stream << '\n';
  }
}

/**
 * Lesson
 */
Lesson::Lesson(std::shared_ptr<const Class>   classPtr,
               std::shared_ptr<const Teacher> teacherPtr,
               std::shared_ptr<const Subject> subjectPtr, int periodsPerWeek)
    : m_Class(std::move(classPtr)), m_Teacher(std::move(teacherPtr)),
      m_Subject(std::move(subjectPtr)), m_PeriodsPerWeek(periodsPerWeek)
{
  assert(m_PeriodsPerWeek >= 1);
}

/**
 * Timetable
 */
bool Timetable::Generate()
{
  using namespace operations_research;
  using namespace sat;

  CpModelBuilder model;

  const int days       = m_Config.days;
  const int periods    = m_Config.periodsPerDay;
  const int numLessons = static_cast<int>(m_Config.lessons.size());

  // Variables: day and period for each lesson
  std::vector<IntVar> lesson_day_vars;
  std::vector<IntVar> lesson_period_vars;

  for (int i = 0; i < numLessons; ++i) {
    lesson_day_vars.push_back(
        model.NewIntVar(Domain(0, days - 1))
            .WithName("lesson_" + std::to_string(i) + "_day"));
    lesson_period_vars.push_back(
        model.NewIntVar(Domain(0, periods - 1))
            .WithName("lesson_" + std::to_string(i) + "_period"));
  }

  // Constraint 1: No teacher or class overlaps
  for (int i = 0; i < numLessons; ++i) {
    for (int j = i + 1; j < numLessons; ++j) {
      auto lesson_i = m_Config.lessons[i];
      auto lesson_j = m_Config.lessons[j];

      bool same_teacher = (lesson_i->GetTeacher() == lesson_j->GetTeacher());
      bool same_class   = (lesson_i->GetClass() == lesson_j->GetClass());

      if (same_teacher || same_class) {
        // Create boolean variables for day equality and period equality
        BoolVar day_equal = model.NewBoolVar();
        model.AddEquality(lesson_day_vars[i], lesson_day_vars[j])
            .OnlyEnforceIf(day_equal);
        model.AddNotEqual(lesson_day_vars[i], lesson_day_vars[j])
            .OnlyEnforceIf(Not(day_equal));

        BoolVar period_equal = model.NewBoolVar();
        model.AddEquality(lesson_period_vars[i], lesson_period_vars[j])
            .OnlyEnforceIf(period_equal);
        model.AddNotEqual(lesson_period_vars[i], lesson_period_vars[j])
            .OnlyEnforceIf(Not(period_equal));

        // Add constraint: NOT (day_equal AND period_equal)
        // Equivalent to: (NOT day_equal) OR (NOT period_equal)
        model.AddBoolOr({Not(day_equal), Not(period_equal)});
      }
    }
  }

  // Constraint 2: Respect availability of teachers and classes
  for (int i = 0; i < numLessons; ++i) {
    auto                lesson        = m_Config.lessons[i];
    const Availability &teacher_avail = lesson->GetTeacher()->GetAvailability();
    const Availability &class_avail   = lesson->GetClass()->GetAvailability();

    // Collect allowed (day, period) pairs where both teacher and class are
    // available
    std::vector<std::pair<int, int>> allowed_slots;
    for (int d = 0; d < days; ++d) {
      for (int p = 0; p < periods; ++p) {
        if (teacher_avail.Get(d, p) && class_avail.Get(d, p)) {
          allowed_slots.emplace_back(d, p);
        }
      }
    }

    if (allowed_slots.empty()) {
      std::cerr << "No available slots for lesson " << i << "\n";
      return false; // No solution possible
    }

    // Create a single IntVar for the slot index
    IntVar slot_var =
        model.NewIntVar(Domain(0, static_cast<int>(allowed_slots.size()) - 1))
            .WithName("lesson_" + std::to_string(i) + "_slot");

    // Link slot_var to day and period variables using Element constraints
    std::vector<int64_t> days_array;
    std::vector<int64_t> periods_array;
    for (auto &slot : allowed_slots) {
      days_array.push_back(slot.first);
      periods_array.push_back(slot.second);
    }

    model.AddElement(slot_var, days_array, lesson_day_vars[i]);
    model.AddElement(slot_var, periods_array, lesson_period_vars[i]);
  }

  // Solve the model
  Model                  cp_model;
  const CpSolverResponse response = SolveCpModel(model.Build(), &cp_model);

  if (response.status() == CpSolverStatus::FEASIBLE ||
      response.status() == CpSolverStatus::OPTIMAL) {
    std::cout << "Solution found:\n";
    for (int i = 0; i < numLessons; ++i) {
      int day    = SolutionIntegerValue(response, lesson_day_vars[i]);
      int period = SolutionIntegerValue(response, lesson_period_vars[i]);
      std::cout << "Lesson " << i << " ("
                << m_Config.lessons[i]->GetClass()->GetName() << ", "
                << m_Config.lessons[i]->GetTeacher()->GetName() << ", "
                << m_Config.lessons[i]->GetSubject()->GetName()
                << ") scheduled at Day " << day << ", Period " << period
                << "\n";
    }
    return true;
  } else {
    std::cout << "No solution found.\n";
    return false;
  }
}

void Timetable::PrintConfig(std::ostream &stream) const
{
  stream << "Timetable Configuration:\n";
  stream << "Name: " << m_Config.name << "\n"
         << "Days: " << m_Config.days << "\n"
         << "Periods per Day: " << m_Config.periodsPerDay << "\n\n";

  stream << "Subjects:\n";
  for (const auto &subject : m_Config.subjects) {
    stream << "  - " << subject.GetName() << "\n";
  }

  stream << "\nTeachers:\n";
  for (const auto &teacher : m_Config.teachers) {
    stream << "  - " << teacher.GetName() << "\n";
  }

  stream << "\nClasses:\n";
  for (const auto &cls : m_Config.classes) {
    stream << "  - " << cls.GetName() << "\n";
  }

  stream << "\nLessons:\n";
  int index = 1;
  for (const auto &lesson : m_Config.lessons) {
    stream << "  Lesson " << index++ << "\n";
  }
}
}; // namespace TimetableWeaver