// v0.2 (week 12, M41, D-bf): the server navigation and identity parts, Avatar and AvatarGroup,
// Breadcrumb and Pagination, through their subpaths. Like /t0, the page must load no @nizivo client
// module (week 12 review R2-6).
import { Avatar, AvatarGroup } from '@nizivo/react/avatar';
import { Breadcrumb } from '@nizivo/react/breadcrumb';
import { Heading } from '@nizivo/react/heading';
import { Pagination } from '@nizivo/react/pagination';

const pageHref = (page) => `/t0-nav?page=${page}`;

export default function Page() {
  return (
    <main>
      <Breadcrumb.Root>
        <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        <Breadcrumb.Item href="/t0">Components</Breadcrumb.Item>
        <Breadcrumb.Item current>Navigation</Breadcrumb.Item>
      </Breadcrumb.Root>
      <Heading level={1}>Navigation and identity</Heading>
      <p>
        <Avatar name="Maya Patel" />
      </p>
      <AvatarGroup total={7}>
        <Avatar name="Maya Patel" />
        <Avatar name="Jonah Lee" />
        <Avatar name="Priya Shah" />
      </AvatarGroup>
      <Pagination page={7} totalPages={13} getHref={pageHref} summary="Showing 121–140 of 248" />
    </main>
  );
}
