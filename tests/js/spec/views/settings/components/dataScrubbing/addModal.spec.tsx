import React from 'react';
import sortBy from 'lodash/sortBy';

import {openMenu} from 'sentry-test/select-new';
import {mountWithTheme} from 'sentry-test/enzyme';

import GlobalModal from 'app/components/globalModal';
import {openModal} from 'app/actionCreators/modal';
import Add from 'app/views/settings/components/dataScrubbing/modals/add';
import convertRelayPiiConfig from 'app/views/settings/components/dataScrubbing/convertRelayPiiConfig';
import {
  ProjectId,
  MethodType,
  RuleType,
} from 'app/views/settings/components/dataScrubbing/types';
import {
  getMethodLabel,
  getRuleLabel,
} from 'app/views/settings/components/dataScrubbing/utils';

// @ts-ignore
const relayPiiConfig = TestStubs.DataScrubbingRelayPiiConfig();
const stringRelayPiiConfig = JSON.stringify(relayPiiConfig);
const organizationSlug = 'sentry';
const convertedRules = convertRelayPiiConfig(stringRelayPiiConfig);
const rules = convertedRules;
const successfullySaved = jest.fn();
const projectId = 'foo';
const endpoint = `/projects/${organizationSlug}/${projectId}/`;
// @ts-ignore
const api = new MockApiClient();

jest.mock('app/api');

async function renderComponent() {
  const wrapper = mountWithTheme(<GlobalModal />);

  openModal(modalProps => (
    <Add
      {...modalProps}
      projectId={projectId}
      savedRules={rules}
      api={api}
      endpoint={endpoint}
      orgSlug={organizationSlug}
      onSubmitSuccess={successfullySaved}
    />
  ));

  // @ts-ignore
  await tick();
  wrapper.update();

  return wrapper;
}

describe('Add Modal', () => {
  it('open Add Rule Modal', async () => {
    const wrapper = await renderComponent();

    expect(wrapper.find('[data-test-id="modal-title"]').text()).toEqual(
      'Add an advanced data scrubbing rule'
    );

    const fieldGroup = wrapper.find('FieldGroup');
    expect(fieldGroup).toHaveLength(2);

    // Method Field
    const methodGroup = fieldGroup.at(0).find('Field');
    expect(methodGroup.find('FieldLabel').text()).toEqual('Method');
    const methodFieldHelp = 'What to do';
    expect(methodGroup.find('QuestionTooltip').prop('title')).toEqual(methodFieldHelp);
    expect(methodGroup.find('Tooltip').prop('title')).toEqual(methodFieldHelp);
    const methodField = methodGroup.find('SelectField');
    expect(methodField.exists()).toBe(true);
    const methodFieldProps = methodField.props();
    expect(methodFieldProps.value).toEqual(MethodType.MASK);
    const methodFieldOptions = sortBy(Object.values(MethodType)).map(value => ({
      ...getMethodLabel(value),
      value,
    }));
    expect(methodFieldProps.options).toEqual(methodFieldOptions);

    // Type Field
    const typeGroup = fieldGroup.at(1).find('Field');
    expect(typeGroup.find('FieldLabel').text()).toEqual('Data Type');
    const typeFieldHelp =
      'What to look for. Use an existing pattern or define your own using regular expressions.';
    expect(typeGroup.find('QuestionTooltip').prop('title')).toEqual(typeFieldHelp);
    expect(typeGroup.find('Tooltip').prop('title')).toEqual(typeFieldHelp);
    const typeField = typeGroup.find('SelectField');
    expect(typeField.exists()).toBe(true);
    const typeFieldProps = typeField.props();
    expect(typeFieldProps.value).toEqual(RuleType.CREDITCARD);

    const typeFieldOptions = sortBy(Object.values(RuleType)).map(value => ({
      label: getRuleLabel(value),
      value,
    }));
    expect(typeFieldProps.options).toEqual(typeFieldOptions);

    // Event ID
    expect(wrapper.find('Toggle').text()).toEqual('Use Event ID for auto-completion');

    // Source Field
    const sourceGroup = wrapper.find('SourceGroup');
    expect(sourceGroup.exists()).toBe(true);
    expect(sourceGroup.find('EventIdField')).toHaveLength(0);
    const sourceField = sourceGroup.find('Field');
    expect(sourceField.find('FieldLabel').text()).toEqual('Source');
    const sourceFieldHelp =
      'Where to look. In the simplest case this can be an attribute name.';
    expect(sourceField.find('QuestionTooltip').prop('title')).toEqual(sourceFieldHelp);
    expect(sourceField.find('Tooltip').prop('title')).toEqual(sourceFieldHelp);

    // Close Modal
    const cancelButton = wrapper.find('[aria-label="Cancel"]').hostNodes();
    expect(cancelButton.exists()).toBe(true);
    cancelButton.simulate('click');

    // @ts-ignore
    await tick();
    wrapper.update();

    expect(wrapper.find('[data-test-id="modal-title"]')).toHaveLength(0);
  });

  it.only('Display placeholder field', async () => {
    const wrapper = await renderComponent();

    const fieldGroup = wrapper.find('FieldGroup');
    expect(fieldGroup).toHaveLength(2);

    // Method Field
    const methodGroup = fieldGroup.at(0).find('Field');
    expect(methodGroup).toHaveLength(1);

    const methodField = methodGroup.find('SelectField');

    openMenu(wrapper, {selector: 'SelectControl'});

    debugger;

    //openMenu(methodField);

    //methodField.simulate('click');

    // @ts-ignore
    await tick();
    wrapper.update();

    debugger;

    const methodFieldOptions = methodField.find('MenuList Option Wrapper');
    expect(methodFieldOptions).toHaveLength(4);
    const replaceOption = methodFieldOptions.at(3);

    expect(replaceOption.find('[data-test-id="label"]').text()).toEqual('Replace');
    expect(replaceOption.find('Description').text()).toEqual(
      '(Replace with Placeholder)'
    );

    replaceOption.simulate('click');

    expect(
      wrapper
        .find('FieldGroup')
        .at(0)
        .find('SelectField')
        .prop('value')
    ).toEqual(MethodType.REPLACE);

    const updatedMethodGroup = wrapper
      .find('FieldGroup')
      .at(0)
      .find('Field');

    expect(updatedMethodGroup).toHaveLength(2);

    const placeholderField = updatedMethodGroup.at(1);
    expect(placeholderField.find('FieldLabel').text()).toEqual(
      'Custom Placeholder (Optional)'
    );
    const placeholderFieldHelp = 'It will replace the default placeholder [Filtered]';
    expect(placeholderField.find('QuestionTooltip').prop('title')).toEqual(
      placeholderFieldHelp
    );
    expect(placeholderField.find('Tooltip').prop('title')).toEqual(placeholderFieldHelp);

    debugger;
  });
});
