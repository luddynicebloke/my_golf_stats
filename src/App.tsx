import { lazy, type Component } from "solid-js";
import { Router, Route } from "@solidjs/router";

import DashLayout from "./components/layouts/DashLayout";
import { ProtectedRoute } from "./security/ProtectedRoute";
import { RoleProtectedRoute } from "./security/RoleProtectedRoute";

import Welcome from "./pages/Welcome";
import SignIn from "./pages/SignIn";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import LatestRounds from "./components/dashboard/latestRounds";
import testpage from "./hooks/testpage";

const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const NewRound = lazy(() => import("./pages/NewRound"));
const CourseEditor = lazy(() => import("./pages/CourseEditor"));
const Import_scorecard = lazy(
  () => import("./components/admin/import_scorecard"),
);
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const RestPassword = lazy(() => import("./pages/ResetPassword"));
const ScorecardEntry = lazy(
  () => import("./components/scoreEntry/ScorecardEntry"),
);
const Rounds = lazy(() => import("./pages/Rounds"));
const RoundShots = lazy(() => import("./pages/RoundShots"));
const Stats = lazy(() => import("./pages/Stats"));
const SelectedRoundStats = lazy(() => import("./pages/SelectedRoundStats"));

const App: Component = () => {
  return (
    <Router>
      <Route path='/' component={Welcome} />
      <Route path='/signin' component={SignIn} />
      <Route path='/register' component={Register} />
      <Route path='*404' component={NotFound} />
      <Route path='test' component={testpage} />
      <Route path='reset-password' component={RestPassword} />

      <Route
        path='/dashboard'
        component={(props) => (
          <ProtectedRoute>
            <DashLayout>{props.children}</DashLayout>
          </ProtectedRoute>
        )}
      >
        <Route
          path='/'
          component={() => (
            <ProtectedRoute allowedRoles={["admin", "user", "pro"]}>
              <Dashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path='/latest-rounds'
          component={(props) => (
            <ProtectedRoute allowedRoles={["admin", "user"]}>
              <LatestRounds {...props} recent={[]} />
            </ProtectedRoute>
          )}
        />
        <Route
          path='/profile'
          component={() => (
            <ProtectedRoute allowedRoles={["admin", "user"]}>
              <Profile />
            </ProtectedRoute>
          )}
        />
        <Route
          path='/new-round'
          component={() => (
            <ProtectedRoute allowedRoles={["admin", "user"]}>
              <NewRound />
            </ProtectedRoute>
          )}
        />
        <Route
          path='/rounds'
          component={() => (
            <ProtectedRoute allowedRoles={["admin", "user", "pro"]}>
              <Rounds />
            </ProtectedRoute>
          )}
        />
        <Route
          path='/rounds/:id'
          component={(props) => (
            <ProtectedRoute allowedRoles={["admin", "user", "pro"]}>
              <RoundShots id={props.params.id} />
            </ProtectedRoute>
          )}
        />
        <Route
          path='/stats'
          component={() => (
            <ProtectedRoute allowedRoles={["admin", "user", "pro"]}>
              <Stats />
            </ProtectedRoute>
          )}
        />
        <Route
          path='/round-analysis'
          component={() => (
            <ProtectedRoute allowedRoles={["admin", "user", "pro"]}>
              <SelectedRoundStats />
            </ProtectedRoute>
          )}
        />
        <Route
          path='/stats/:id'
          component={() => (
            <ProtectedRoute allowedRoles={["admin", "user", "pro"]}>
              <Stats />
            </ProtectedRoute>
          )}
        />
      </Route>
      <Route>
        <Route
          path='/scorecard-entry/:id'
          component={(props) => (
            <ProtectedRoute allowedRoles={["admin", "user"]}>
              <ScorecardEntry id={props.params.id} />
            </ProtectedRoute>
          )}
        />
      </Route>

      {/* Admin routes */}
      <Route
        path='/admin'
        component={() => (
          <RoleProtectedRoute requiredRole='admin'>
            <AdminPanel />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path='/admin/course_editor/:id'
        component={() => (
          <RoleProtectedRoute requiredRole='admin'>
            <CourseEditor />
          </RoleProtectedRoute>
        )}
      />
      <Route
        path='/admin/import_scorecard/:id'
        component={() => (
          <RoleProtectedRoute requiredRole='admin'>
            <Import_scorecard />
          </RoleProtectedRoute>
        )}
      />
    </Router>
  );
};

export default App;
