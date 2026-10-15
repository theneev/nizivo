// A Menu open on the server (`defaultOpen`), as one island: React Aria renders no popup during SSR,
// so the menu mounts when the island hydrates. A Button is the trigger through `render`.
import { Button } from '@nizivo/react/button';
import { Menu } from '@nizivo/react/menu';

export function ProductMenu() {
  return (
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
  );
}
