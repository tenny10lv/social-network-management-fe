import { Outlet } from 'react-router';

export function Content() {
  return (
    <div className="grow content pt-5" role="content">
      <Outlet />
    </div>
  );
}
