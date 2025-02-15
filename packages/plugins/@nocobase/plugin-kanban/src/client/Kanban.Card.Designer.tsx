import { MenuOutlined } from '@ant-design/icons';
import { ISchema, useFieldSchema } from '@formily/react';
import { uid } from '@formily/shared';
import { Space } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAPIClient,
  useSchemaInitializerRender,
  SchemaInitializer,
  createDesignable,
  useDesignable,
  useAssociatedFormItemInitializerFields,
  useFormItemInitializerFields,
  SchemaInitializerOpenModeSchemaItems,
  useGetAriaLabelOfDesigner,
} from '@nocobase/client';

const gridRowColWrap = (schema: ISchema) => {
  schema['x-read-pretty'] = true;
  return {
    type: 'void',
    'x-component': 'Grid.Row',
    properties: {
      [uid()]: {
        type: 'void',
        'x-component': 'Grid.Col',
        properties: {
          [schema.name || uid()]: schema,
        },
      },
    },
  };
};

// export const removeGridFormItem = (schema, cb) => {
//   cb(schema, {
//     removeParentsIfNoChildren: true,
//     breakRemoveOn: {
//       'x-component': 'Kanban.Card',
//     },
//   });
// };

export const KanbanCardDesigner = () => {
  const { designable } = useDesignable();
  const { getAriaLabel } = useGetAriaLabelOfDesigner();
  const { render } = useSchemaInitializerRender('KanbanCardInitializers');
  if (!designable) {
    return null;
  }
  return (
    <div className={'general-schema-designer'}>
      <div className={'general-schema-designer-icons'}>
        <Space size={2} align={'center'}>
          {render()}
        </Space>
      </div>
    </div>
  );
};

export const kanbanCardInitializers = new SchemaInitializer({
  name: 'KanbanCardInitializers',
  wrap: gridRowColWrap,
  useInsert() {
    const fieldSchema = useFieldSchema();
    const { t } = useTranslation();
    const api = useAPIClient();
    const { refresh } = useDesignable();

    return (schema) => {
      const gridSchema = fieldSchema.reduceProperties((buf, schema) => {
        if (schema['x-component'] === 'Grid') {
          return schema;
        }
        return buf;
      }, null);

      if (!gridSchema) {
        return;
      }

      const dn = createDesignable({
        t,
        api,
        refresh,
        current: gridSchema,
      });
      dn.loadAPIClientEvents();
      dn.insertBeforeEnd(schema);
    };
  },
  Component: (props: any) => {
    const { getAriaLabel } = useGetAriaLabelOfDesigner();
    return (
      <MenuOutlined
        {...props}
        role="button"
        aria-label={getAriaLabel('schema-initializer')}
        style={{ cursor: 'pointer', fontSize: 12 }}
      />
    );
  },
  items: [
    {
      type: 'itemGroup',
      title: '{{t("Display fields")}}',
      name: 'displayFields',
      useChildren: useFormItemInitializerFields,
    },
    {
      type: 'itemGroup',
      divider: true,
      title: '{{t("Display association fields")}}',
      name: 'displayAssociationFields',
      checkChildrenLength: true,
      useChildren() {
        const associationFields = useAssociatedFormItemInitializerFields({
          readPretty: true,
          block: 'Kanban',
        });
        return associationFields;
      },
    },
    {
      name: 'divider',
      type: 'divider',
    },
    {
      title: '{{t("Display field title")}}',
      name: 'displayFieldTitle',
      Component: 'Kanban.Card.Designer.TitleSwitch',
      enable: true,
    },
    {
      name: 'openMode',
      Component: SchemaInitializerOpenModeSchemaItems,
    },
  ],
});
