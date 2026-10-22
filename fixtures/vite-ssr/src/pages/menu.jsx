// A Menu open on first render (`defaultOpen`), a Button as its trigger through `render`; link items
// navigate with no handler.
import { Button } from '@nizivo/react/button';
import { Menu } from '@nizivo/react/menu';

export default function Page() {
  return (
    <main>
      <h1>Menu open on the server</h1>
      <Menu.Root defaultOpen>
        <Menu.Trigger render={<Button variant="secondary">Actions</Button>} />
        <Menu.Popup>
          <Menu.Group>
            <Menu.GroupLabel>Product</Menu.GroupLabel>
            <Menu.Item shortcut="mod+e">Edit product</Menu.Item>
            <Menu.Item shortcut="mod+d">Duplicate product</Menu.Item>
            <Menu.Item href="#preview">Preview on store</Menu.Item>
          </Menu.Group>
          <Menu.Separator />
          <Menu.CheckboxItem defaultChecked>Show archived</Menu.CheckboxItem>
          <Menu.Separator />
          <Menu.Item tone="critical">Delete product</Menu.Item>
        </Menu.Popup>
      </Menu.Root>
    </main>
  );
}
