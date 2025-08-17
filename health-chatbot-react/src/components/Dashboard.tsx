import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, CheckCircle, Clock, Target } from "lucide-react";
import {
  BackendService,
  HealthPlan,
  PlanProgressStats,
  DashboardSummary,
  TimeSpentAnalytics,
  WordGenerationTrends,
} from "../api/backend";
import TopBar from "./TopBar";
import { Link } from "react-router-dom";

const backendService = new BackendService();

const Dashboard: React.FC = () => {
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [planStats, setPlanStats] = useState<Record<string, PlanProgressStats>>(
    {}
  );
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [timeSpentData, setTimeSpentData] = useState<TimeSpentAnalytics | null>(
    null
  );
  const [wordTrends, setWordTrends] = useState<WordGenerationTrends | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format decimal minutes to minutes and seconds
  const formatTime = (decimalMinutes: number): string => {
    const totalSeconds = Math.round(decimalMinutes * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    } else if (seconds === 0) {
      return `${minutes}m`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all dashboard data
      const [plansData, summaryData, timeAnalytics, wordTrendsData] =
        await Promise.all([
          backendService.getHealthPlans(),
          backendService.getDashboardSummary(),
          backendService.getTimeSpentAnalytics(),
          backendService.getWordGenerationTrends(),
        ]);

      setPlans(plansData);
      setSummary(summaryData);
      setTimeSpentData(timeAnalytics);
      setWordTrends(wordTrendsData);

      // Load progress stats for each plan
      const statsPromises = plansData.map((plan) =>
        backendService.getPlanProgress(plan.id)
      );

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, PlanProgressStats> = {};

      statsResults.forEach((stat, index) => {
        if (stat) {
          statsMap[plansData[index].id] = stat;
        }
      });

      setPlanStats(statsMap);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error("Dashboard loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllTasksComplete = async (
    planId: string,
    condition: string
  ) => {
    try {
      const success = await backendService.markAllTasksComplete(
        planId,
        condition
      );
      if (success) {
        // Reload dashboard data to reflect changes
        loadDashboardData();
      }
    } catch (err) {
      console.error("Error marking tasks complete:", err);
    }
  };

  const handleDeactivatePlan = async (planId: string, planName: string) => {
    // Confirm before deactivating
    if (
      window.confirm(
        `Are you sure you want to deactivate "${planName}"? This will remove it from your active plans.`
      )
    ) {
      try {
        const success = await backendService.deactivatePlan(planId);
        if (success) {
          // Reload dashboard data to reflect changes
          loadDashboardData();
        }
      } catch (err) {
        console.error("Error deactivating plan:", err);
      }
    }
  };

  // Prepare chart data
  const progressChartData = plans.map((plan) => {
    const stats = planStats[plan.id];
    return {
      name: plan.plan_name.replace(" Plan", ""),
      condition: plan.condition,
      progress: stats?.progress_percentage || 0,
      completed: stats?.completed_tasks || 0,
      total: stats?.total_tasks || 0,
      timeline: plan.timeline_days,
    };
  });

  const pieChartData = summary
    ? [
        { name: "Completed", value: summary.completed_tasks, color: "#10b981" },
        {
          name: "Remaining",
          value: summary.total_tasks - summary.completed_tasks,
          color: "#ef4444",
        },
      ]
    : [];

  // Daily progress trend data (combined)
  const dailyTrendData = Object.values(planStats)
    .flatMap((stat) =>
      stat.daily_progress.map((day) => ({
        date: day.date,
        completed: day.completed,
        total: day.total,
        percentage: Math.round((day.completed / day.total) * 100),
      }))
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // Plan timeline progress data from start to end
  const getPlanTimelineData = (plan: HealthPlan, stats: PlanProgressStats) => {
    const timelineData = [];
    const startDate = new Date(plan.created_at);
    const timelineDays = plan.timeline_days;

    // Generate data for each day of the plan timeline
    for (let i = 0; i < timelineDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      // Format date for display (e.g., "Jan 15")
      const displayDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      // Count completed tasks for this date
      const completedTasks = plan.tasks.filter((task) =>
        task.progress.includes(dateStr)
      ).length;

      const completionPercentage =
        plan.tasks.length > 0
          ? Math.round((completedTasks / plan.tasks.length) * 100)
          : 0;

      // Determine if this day is in the past, today, or future
      const today = new Date().toISOString().split("T")[0];
      const dayStatus =
        dateStr < today ? "past" : dateStr === today ? "today" : "future";

      timelineData.push({
        day: `Day ${i + 1}`,
        date: dateStr,
        displayDate: displayDate,
        completed: completedTasks,
        total: plan.tasks.length,
        percentage: completionPercentage,
        dayNumber: i + 1,
        status: dayStatus,
      });
    }

    return timelineData;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ {error}</div>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => {}} backendConnected={true} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Plans
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {summary.total_active_plans}
                  </p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Tasks
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {summary.total_tasks}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-gray-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">
                    {summary.completed_tasks}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Overall Progress
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {summary.overall_progress}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Plan Progress Bar Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Plan Progress Overview
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={progressChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "progress") return [`${value}%`, "Progress"];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Plan: ${label}`}
                />
                <Bar dataKey="progress" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Task Completion Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Task Completion Status
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Progress Trend */}
        {dailyTrendData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Overall Daily Progress Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "percentage")
                      return [`${value}%`, "Daily Completion"];
                    return [value, name];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Time Spent Analytics Charts */}
        {timeSpentData && timeSpentData.daily_time_data.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Time Spent Per Day */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Time Spent with AI (Last 7 Days)
                </h3>
                <div className="text-sm text-gray-500">
                  Total: {formatTime(timeSpentData.summary.total_time_minutes)}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeSpentData.daily_time_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="display_date"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{
                      value: "Minutes",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "time_spent_minutes")
                        return [formatTime(Number(value)), "Time Spent"];
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0] && payload[0].payload) {
                        const data = payload[0].payload;
                        return `${label} (${data.total_words} words)`;
                      }
                      return label;
                    }}
                  />
                  <Bar
                    dataKey="time_spent_minutes"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-gray-600">
                <p>📊 Based on 1.5 words/second generation speed</p>
                <p>
                  💡 Average:{" "}
                  {formatTime(timeSpentData.summary.average_daily_time_minutes)}
                  /day
                </p>
              </div>
            </div>

            {/* Specialist Time Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Time Spent by Specialist (Last 7 Days)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(
                      timeSpentData.summary.specialist_word_totals
                    ).map(([name, words]) => ({
                      name,
                      words,
                      time_minutes: Math.round((words / 1.5 / 60) * 10) / 10,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, time_minutes, percent }) =>
                      `${name}: ${formatTime(time_minutes)} (${(
                        (percent || 0) * 100
                      ).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="time_minutes"
                  >
                    {Object.entries(
                      timeSpentData.summary.specialist_word_totals
                    ).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          [
                            "#3b82f6",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6",
                            "#ec4899",
                            "#06b6d4",
                          ][index % 7]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "time_minutes")
                        return [formatTime(Number(value)), "Time Spent"];
                      return [value, name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-gray-600">
                <p>
                  🎯 Most active:{" "}
                  {Object.entries(
                    timeSpentData.summary.specialist_word_totals
                  ).sort(([, a], [, b]) => b - a)[0]?.[0] || "None"}{" "}
                  (
                  {formatTime(
                    Math.round(
                      ((Object.entries(
                        timeSpentData.summary.specialist_word_totals
                      ).sort(([, a], [, b]) => b - a)[0]?.[1] || 0) /
                        1.5 /
                        60) *
                        10
                    ) / 10
                  )}
                  )
                </p>
                <p>
                  📈 Total specialists used:{" "}
                  {
                    Object.keys(timeSpentData.summary.specialist_word_totals)
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Word Generation Trends by Specialist */}
        {wordTrends && Object.keys(wordTrends.specialist_trends).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Specialist Word Generation Trends
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={(() => {
                  // Combine all specialist data by date
                  const combinedData: Record<string, any> = {};

                  Object.entries(wordTrends.specialist_trends).forEach(
                    ([specialist, data]) => {
                      data.forEach((day) => {
                        if (!combinedData[day.date]) {
                          combinedData[day.date] = {
                            date: day.date,
                            display_date: day.display_date,
                          };
                        }
                        combinedData[day.date][specialist] = day.words;
                      });
                    }
                  );

                  return Object.values(combinedData).sort((a, b) =>
                    a.date.localeCompare(b.date)
                  );
                })()}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="display_date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "Words Generated",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0] && payload[0].payload) {
                      return payload[0].payload.display_date;
                    }
                    return label;
                  }}
                  formatter={(value, name) => [`${value} words`, name]}
                />
                {Object.keys(wordTrends.specialist_trends).map(
                  (specialist, index) => (
                    <Line
                      key={specialist}
                      type="monotone"
                      dataKey={specialist}
                      stroke={
                        [
                          "#3b82f6",
                          "#10b981",
                          "#f59e0b",
                          "#ef4444",
                          "#8b5cf6",
                          "#ec4899",
                          "#06b6d4",
                        ][index % 7]
                      }
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls={false}
                    />
                  )
                )}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {wordTrends.specialist_totals.map((specialist, index) => (
                <div key={specialist.specialist_name} className="text-center">
                  <div
                    className="w-4 h-4 rounded mx-auto mb-2"
                    style={{
                      backgroundColor: [
                        "#3b82f6",
                        "#10b981",
                        "#f59e0b",
                        "#ef4444",
                        "#8b5cf6",
                        "#ec4899",
                        "#06b6d4",
                      ][index % 7],
                    }}
                  ></div>
                  <div className="text-sm font-medium text-gray-900">
                    {specialist.specialist_name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {specialist.total_words} words total
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan Timeline Progress Charts */}
        {plans.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Plan Timeline Progress
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {plans.map((plan) => {
                const stats = planStats[plan.id];
                if (!stats) return null;

                const timelineData = getPlanTimelineData(plan, stats);
                const maxPercentage = Math.max(
                  ...timelineData.map((d) => d.percentage),
                  20
                );

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-xl shadow-sm p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {plan.plan_name.replace(" Plan", "")}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">
                          {plan.condition}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {stats.progress_percentage}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {plan.timeline_days}-day plan
                        </div>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="displayDate"
                          tick={{ fontSize: 10 }}
                          stroke="#6b7280"
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          interval={0}
                        />
                        <YAxis
                          domain={[0, Math.max(maxPercentage + 10, 100)]}
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                        />
                        <Tooltip
                          formatter={(value, name) => {
                            if (name === "percentage")
                              return [`${value}%`, "Completion Rate"];
                            if (name === "completed")
                              return [`${value}`, "Tasks Completed"];
                            return [value, name];
                          }}
                          labelFormatter={(label, payload) => {
                            if (payload && payload[0] && payload[0].payload) {
                              const data = payload[0].payload;
                              const date = new Date(data.date);
                              return `${data.day} (${date.toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  month: "short",
                                  day: "numeric",
                                }
                              )})`;
                            }
                            return label;
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="percentage"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={(props) => {
                            const { payload } = props;
                            let fill = "#3b82f6";

                            // Different colors based on day status
                            if (payload?.status === "today") {
                              fill = "#10b981"; // Green for today
                            } else if (payload?.status === "future") {
                              fill = "#9ca3af"; // Gray for future days
                            }

                            return (
                              <circle
                                cx={props.cx}
                                cy={props.cy}
                                r={4}
                                fill={fill}
                                stroke="#ffffff"
                                strokeWidth={2}
                              />
                            );
                          }}
                          activeDot={{
                            r: 6,
                            fill: "#1d4ed8",
                            stroke: "#ffffff",
                            strokeWidth: 2,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>

                    {/* Plan Timeline Summary */}
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600">
                          Best Day:{" "}
                          <span className="font-medium text-blue-600">
                            {(() => {
                              const bestDay = timelineData.reduce(
                                (best, current) =>
                                  current.percentage > best.percentage
                                    ? current
                                    : best
                              );
                              return `${bestDay.day} (${bestDay.displayDate})`;
                            })()}
                          </span>
                        </span>
                        <span className="text-gray-600">
                          Days Completed:{" "}
                          <span className="font-medium text-gray-900">
                            {
                              timelineData.filter((day) => day.percentage > 0)
                                .length
                            }{" "}
                            / {timelineData.length}
                          </span>
                        </span>
                      </div>
                      <div className="text-gray-500">
                        {plan.timeline_days}-day plan timeline
                      </div>
                    </div>

                    {/* Plan Status Indicator */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const today = new Date().toISOString().split("T")[0];
                          const todayIndex = timelineData.findIndex(
                            (day) => day.date === today
                          );
                          const isOnTrack =
                            todayIndex !== -1 &&
                            timelineData
                              .slice(0, todayIndex + 1)
                              .every((day) => day.percentage > 0);

                          if (todayIndex === -1) {
                            return (
                              <>
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-xs text-gray-500">
                                  Plan not started
                                </span>
                              </>
                            );
                          } else if (todayIndex >= timelineData.length) {
                            return (
                              <>
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-600">
                                  Plan completed
                                </span>
                              </>
                            );
                          } else if (isOnTrack) {
                            return (
                              <>
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-600">
                                  On track
                                </span>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-xs text-yellow-600">
                                  Behind schedule
                                </span>
                              </>
                            );
                          }
                        })()}
                      </div>
                      <span className="text-xs text-gray-500">
                        Started:{" "}
                        {new Date(plan.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Plan Management Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Plan Management
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const stats = planStats[plan.id];
              const todayDate = new Date().toISOString().split("T")[0];
              const todayTasks = plan.tasks.filter(
                (task) => !task.progress.includes(todayDate)
              );

              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            {plan.plan_name}
                          </h4>
                          <p className="text-sm text-gray-600 capitalize">
                            {plan.condition}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleDeactivatePlan(plan.id, plan.plan_name)
                          }
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors ml-2"
                          title="Deactivate Plan"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {stats?.progress_percentage || 0}%
                      </div>
                      <div className="text-sm text-gray-500">
                        {stats?.completed_tasks || 0}/{stats?.total_tasks || 0}{" "}
                        tasks
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats?.progress_percentage || 0}%` }}
                    ></div>
                  </div>

                  {/* Timeline Info */}
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <span>{plan.timeline_days}-day plan</span>
                    <span>
                      Created: {new Date(plan.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Today's Tasks */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Today's Pending Tasks: {todayTasks.length}
                    </p>
                    {todayTasks.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {todayTasks.slice(0, 2).map((task, index) => (
                          <div key={index} className="truncate">
                            • {task.task_name.replace("Day 1-7: ", "")}
                          </div>
                        ))}
                        {todayTasks.length > 2 && (
                          <div>... and {todayTasks.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {todayTasks.length > 0 ? (
                    <button
                      onClick={() =>
                        handleMarkAllTasksComplete(plan.id, plan.condition)
                      }
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      ✅ Mark All Complete Today
                    </button>
                  ) : (
                    <div className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-center text-sm">
                      🎉 All tasks complete for today!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {plans.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Health Plans Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start chatting about your health concerns to create personalized
              plans!
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Start Chat
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
