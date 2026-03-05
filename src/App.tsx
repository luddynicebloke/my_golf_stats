import { lazy, type Component } from "solid-js";
import { TransProvider } from "@mbarzda/solid-i18next";
import { Router, Route } from "@solidjs/router";

import DashLayout from "./components/layouts/DashLayout";
import { ProtectedRoute } from "./security/ProtectedRoute";
import { RoleProtectedRoute } from "./security/RoleProtectedRoute";

import Welcome from "./pages/Welcome";
import SignIn from "./pages/SignIn";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import LatestRounds from "./pages/LatestRounds";
import testpage from "./hooks/testpage";

const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const NewRound = lazy(() => import("./pages/NewRound"));
const CourseEditor = lazy(() => import("./pages/CourseEditor"));
const Import_scorecard = lazy(
  () => import("./components/admin/import_scorecard"),
);
const Profile = lazy(() => import("./pages/Profile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ScorecardEntry = lazy(
  () => import("./components/scoreEntry/ScorecardEntry"),
);

const App: Component = () => {
  return (
    <TransProvider>
      <Router>
        <Route path='/' component={Welcome} />
        <Route path='/signin' component={SignIn} />
        <Route path='/register' component={Register} />
        <Route path='/reset-password' component={ResetPassword} />
        <Route path='/change-password' component={ChangePassword} />
        <Route path='*404' component={NotFound} />
        <Route path='test' component={testpage} />

        <Route path='/dashboard' component={DashLayout}>
          <Route
            path='/'
            component={() => (
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path='/latest-rounds'
            component={(props) => (
              <ProtectedRoute>
                <LatestRounds {...props} recent={[]} />
              </ProtectedRoute>
            )}
          />
          <Route
            path='/profile'
            component={(props) => (
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            )}
          />
          <Route
            path='/new-round'
            component={(props) => (
              <ProtectedRoute>
                <NewRound />
              </ProtectedRoute>
            )}
          />
        </Route>
        <Route>
          <Route
            path='/scorecard-entry/:id'
            component={(props) => (
              <ProtectedRoute>
                {(ScorecardEntry as any)({ id: props.params.id })}
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
          path='/course_editor/:id'
          component={(props) => (
            <RoleProtectedRoute requiredRole='admin'>
              {(CourseEditor as any)({ id: props.params.id })}
            </RoleProtectedRoute>
          )}
        />
        <Route
          path='/import_scorecard/:id'
          component={(props) => (
            <RoleProtectedRoute requiredRole='admin'>
              {(Import_scorecard as any)({ id: props.params.id })}
            </RoleProtectedRoute>
          )}
        />
      </Router>
    </TransProvider>
  );
};

export default App;
