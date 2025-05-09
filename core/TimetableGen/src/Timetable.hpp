#pragma once

#include <string>
#include <vector>
#include <iostream>
#include <cassert>
#include <memory>
#include <iomanip>
#include <map>
#include <iostream>

#include "ortools/sat/cp_model.h"

namespace TimetableWeaver
{
class Availability
{
public:
  Availability(int days, int periods);

  void Set(int day, int period, bool val);
  void SetDay(int day, bool val);

  void Toggle(int day, int period);
  void ToggleDay(int day);

  bool     Get(int day, int period) const;
  uint32_t GetDay(int day) const;

  void Print(std::ostream &stream) const;

private:
  int                   m_Days;
  int                   m_PeriodsPerDay;
  std::vector<uint32_t> m_Buffer;
};

class Subject
{
public:
  explicit Subject(const std::string &name, const Availability &availability)
      : m_Name(name), m_Availability(availability) {};

  const std::string  &GetName() const { return m_Name; }
  const Availability &GetAvailability() const { return m_Availability; }

private:
  std::string  m_Name;
  Availability m_Availability;
};

class Teacher
{
public:
  explicit Teacher(const std::string &name, const Availability &availability)
      : m_Name(name), m_Availability(availability) {};

  const std::string  &GetName() const { return m_Name; }
  const Availability &GetAvailability() const { return m_Availability; }

private:
  std::string  m_Name;
  Availability m_Availability;
};

class Class
{
public:
  explicit Class(const std::string &name, const Availability &availability)
      : m_Name(name), m_Availability(availability) {};

  const std::string  &GetName() const { return m_Name; }
  const Availability &GetAvailability() const { return m_Availability; }

private:
  std::string  m_Name;
  Availability m_Availability;
};

class Lesson
{
public:
  explicit Lesson(std::shared_ptr<const Class>   classPtr,
                  std::shared_ptr<const Teacher> teacherPtr,
                  std::shared_ptr<const Subject> subjectPtr,
                  int                            periodsPerWeek);

  std::shared_ptr<const Class>   GetClass() const { return m_Class; }
  std::shared_ptr<const Teacher> GetTeacher() const { return m_Teacher; }
  std::shared_ptr<const Subject> GetSubject() const { return m_Subject; }
  int GetPeriodsPerWeek() const { return m_PeriodsPerWeek; }

private:
  std::shared_ptr<const Class>   m_Class   = nullptr;
  std::shared_ptr<const Teacher> m_Teacher = nullptr;
  std::shared_ptr<const Subject> m_Subject = nullptr;

  int m_PeriodsPerWeek = 1;
};

struct TimetableConfig {
  std::string name          = "Timetable";
  int         days          = 5;
  int         periodsPerDay = 6;

  std::vector<Subject>                 subjects;
  std::vector<Teacher>                 teachers;
  std::vector<Class>                   classes;
  std::vector<std::shared_ptr<Lesson>> lessons;
};

class Timetable
{
public:
  explicit Timetable(const TimetableConfig &config) : m_Config(config) {};

  bool Generate();

  void PrintConfig(std::ostream &stream) const;
  // void PrintSchedule(std::ostream &stream) const;

private:
  TimetableConfig m_Config;
};
}; // namespace TimetableWeaver