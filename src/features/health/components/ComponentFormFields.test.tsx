import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';

import {
  componentFormSchema,
  newComponentFormValues,
  SERVICE_ROUTES,
  type ComponentFormValues,
} from '../schemas/componentForm';
import { ComponentFormFields } from './ComponentFormFields';

const text = messages.health.registry;

/** The fields in a form of their own, as the creation and the edition hold them. */
function Harness({
  defaultValues = newComponentFormValues('service'),
  fixed,
}: {
  readonly defaultValues?: ComponentFormValues;
  readonly fixed?: Parameters<typeof ComponentFormFields>[0]['fixed'];
}) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ComponentFormValues>({ resolver: zodResolver(componentFormSchema), defaultValues });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(() => undefined)(event);
      }}
    >
      <ComponentFormFields
        register={register}
        control={control}
        errors={errors}
        fixed={fixed}
        onKindChange={(kind) => {
          const routes = newComponentFormValues(kind);
          setValue('livePath', routes.livePath);
          setValue('readyPath', routes.readyPath);
          setValue('infoPath', routes.infoPath);
        }}
      />
      <button type="submit">{messages.common.save}</button>
    </form>
  );
}

const input = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });

describe('ComponentFormFields', () => {
  it('proposes the routes of the v1 contract to a new microservice, enabled (FR-036)', () => {
    render(<Harness />);

    expect(screen.getByRole('radio', { name: text.kinds.service })).toBeChecked();
    expect(input(text.fields.livePath)).toHaveValue(SERVICE_ROUTES.livePath);
    expect(input(text.fields.readyPath)).toHaveValue(SERVICE_ROUTES.readyPath);
    expect(input(text.fields.infoPath)).toHaveValue(SERVICE_ROUTES.infoPath);
    expect(screen.getByRole('checkbox', { name: text.fields.enabled })).toBeChecked();
  });

  it('asks a frontend for its health route, with an optional information route and a warning, without readiness', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('radio', { name: text.kinds.frontend }));

    expect(input(text.fields.healthPath)).toHaveValue('');
    expect(input(text.fields.infoPath)).toHaveValue('');
    expect(screen.getByText(text.form.optional)).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: new RegExp(text.fields.readyPath) }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(text.form.frontendWarning)).toBeInTheDocument();
  });

  it('shows the code and the kind as fixed information in the edition (FR-037)', () => {
    render(
      <Harness
        defaultValues={{ ...newComponentFormValues('service'), code: 'mailysoft-usuarios' }}
        fixed={{ code: 'mailysoft-usuarios', kind: 'service' }}
      />,
    );

    expect(screen.queryByRole('textbox', { name: /^Código/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText(text.form.fixedInfo)).toBeInTheDocument();
    expect(screen.getByText(/mailysoft-usuarios/)).toBeInTheDocument();
  });

  it('tells the format of each field next to it before anything is sent (FR-038)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);

    await user.type(input(text.fields.code), 'Mal-Codigo-');
    await user.type(input(text.fields.baseUrl), 'ftp://x');
    await user.clear(input(text.fields.livePath));
    await user.type(input(text.fields.livePath), 'health');
    await user.type(input(text.fields.sortOrder), '1.5');
    await user.click(screen.getByRole('button', { name: messages.common.save }));

    expect(await screen.findByText(text.form.required)).toBeInTheDocument();
    expect(input(text.fields.name)).toHaveAccessibleDescription(text.form.required);
    expect(input(text.fields.code)).toHaveAccessibleDescription(text.form.code);
    expect(input(text.fields.baseUrl)).toHaveAccessibleDescription(text.form.baseUrl);
    expect(input(text.fields.livePath)).toHaveAccessibleDescription(text.form.path);
    expect(input(text.fields.sortOrder)).toHaveAccessibleDescription(text.form.sortOrder);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Harness />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
