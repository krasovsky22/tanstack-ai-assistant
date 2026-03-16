import { Link } from '@tanstack/react-router';
import { Breadcrumb, Box, Text } from '@chakra-ui/react';

type BreadcrumbItem = {
  label: string;
  to?: string;
};

type Props = {
  items: BreadcrumbItem[];
};

export function AppBreadcrumb({ items }: Props) {
  return (
    <Box mb="4">
      <Breadcrumb.Root>
        <Breadcrumb.List>
          {items.map((item, index) => (
            <Breadcrumb.Item key={index}>
              {item.to ? (
                <Breadcrumb.Link asChild>
                  <Link to={item.to}>{item.label}</Link>
                </Breadcrumb.Link>
              ) : (
                <Breadcrumb.CurrentLink>
                  <Text as="span">{item.label}</Text>
                </Breadcrumb.CurrentLink>
              )}
              {index < items.length - 1 && <Breadcrumb.Separator />}
            </Breadcrumb.Item>
          ))}
        </Breadcrumb.List>
      </Breadcrumb.Root>
    </Box>
  );
}
