#include "Timetable.hpp"

int main(int argc, char *argv[])
{
  using namespace TimetableWeaver;

  const int days          = 5;
  const int periodsPerDay = 6;

  // Create full availability for all teachers and classes
  Availability full_avail(days, periodsPerDay);

  // Create teachers
  Teacher teacher1("Alice", full_avail);
  Teacher teacher2("Bob", full_avail);

  // Create classes
  Class class1("Class 1", full_avail);
  Class class2("Class 2", full_avail);

  // Create subjects
  Subject math("Math", full_avail);
  Subject physics("Physics", full_avail);

  // Create lessons
  auto lesson1 = std::make_shared<Lesson>(std::make_shared<Class>(class1),
                                          std::make_shared<Teacher>(teacher1),
                                          std::make_shared<Subject>(math), 3);
  auto lesson2 = std::make_shared<Lesson>(
      std::make_shared<Class>(class2), std::make_shared<Teacher>(teacher1),
      std::make_shared<Subject>(physics), 2);
  auto lesson3 = std::make_shared<Lesson>(
      std::make_shared<Class>(class1), std::make_shared<Teacher>(teacher2),
      std::make_shared<Subject>(physics), 1);

  // Setup timetable config
  TimetableConfig config;
  config.days          = days;
  config.periodsPerDay = periodsPerDay;
  config.teachers      = {teacher1, teacher2};
  config.classes       = {class1, class2};
  config.subjects      = {math, physics};
  config.lessons       = {lesson1, lesson2, lesson3};

  // Create timetable and generate schedule
  Timetable timetable(config);
  if (timetable.Generate()) {
    std::cout << "Timetable generated successfully.\n";
  } else {
    std::cout << "Failed to generate timetable.\n";
  }
}