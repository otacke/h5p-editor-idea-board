export default class IdeaBoard {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params, setValue) {
    this.parent = parent;
    this.field = field;
    this.params = params;
    this.setValue = setValue;

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // DOM
    this.$container = H5P.jQuery('<div>', {
      class: 'h5peditor-idea-board'
    });

    // Instantiate original field (or create your own and call setValue)
    this.fieldInstance = new H5PEditor.widgets[this.field.type](this.parent, this.field, this.params, this.setValue);

    // Relay changes
    if (this.fieldInstance.changes) {
      this.fieldInstance.changes.push(() => {
        this.handleFieldChange();
      });
    }

    // Errors (or add your own)
    this.$errors = this.$container.find('.h5p-errors');

    const boardParams = (this.parent instanceof H5PEditor.Library) ? this.parent.params.params : this.parent.params;

    const viewUberName = Object
      .keys(H5PEditor.loadedCallbacks)
      .filter((key) => key.startsWith('H5P.IdeaBoard'))
      .shift();

    this.ideaBoardView = H5P.newRunnable(
      {
        library: viewUberName,
        params: boardParams,
        contentId: H5PEditor.contentId,
      },
      H5PEditor.contentId,
      undefined,
      false,
      { IdeaBoardEditor: this }
    );

    this.parent.ready(() => {
      this.passReadies = false;
      this.handleParentReady();
    });

    window.addEventListener('resize', () => {
      this.ideaBoardView.trigger('resize');
    });
  }

  ready(callback) {
    if (this.passReadies) {
      this.parent.ready(callback);
    }
    else {
      callback();
    }
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    // H5P group widget does not initialize correctly before attached somewhere.
    const nirvanaDOM = document.createElement('div');
    this.fieldInstance.appendTo(H5P.jQuery(nirvanaDOM));

    this.ideaBoardView.attach(this.$container);

    $wrapper.get(0).append(this.$container.get(0));
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @returns {boolean} True, if current value is valid, else false.
   */
  validate() {
    return this.fieldInstance.validate();
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.$container.get(0).remove();
  }

  /**
   * Handle change of field.
   */
  handleFieldChange() {
    this.params = this.fieldInstance.params;
    this.changes.forEach((change) => {
      change(this.params);
    });
  }

  /**
   * Handle parent ready.
   */
  handleParentReady() {
    this.passReadies = false;

    this.makeCardsListInstanceAvailable();
    this.initializeBackgroundImage();
    this.initializeBackgroundColor();
  }

  makeCardsListInstanceAvailable() {
    this.cardsListInstance = H5PEditor.findField('cards', this.fieldInstance);
    if (!this.cardsListInstance) {
      throw H5PEditor.t('core', 'unknownFieldPath', { ':path': this.cardsListInstance });
    }
  }

  getCardsListGroupInstance(index) {
    if (!this.cardsListInstance) {
      return false;
    }

    let group = false;
    this.cardsListInstance.forEachChild((child, childIndex) => {
      if (group) {
        return;
      }

      if (childIndex === index) {
        group = child;
      }
    });

    return group;
  }

  /**
   * Initialize background image.
   */
  initializeBackgroundImage() {
    this.backgroundImageField = H5PEditor.findField('backgroundSettings/backgroundImage', this.parent);

    if (!this.backgroundImageField) {
      throw H5PEditor.t('core', 'unknownFieldPath', { ':path': this.backgroundImageField });
    }

    this.ideaBoardView.setBackgroundImage(this.backgroundImageField.params);

    this.backgroundImageField.changes.push((change) => {
      this.ideaBoardView.setBackgroundImage(change);
    });
  }

  /**
   * Initialize background color.
   */
  initializeBackgroundColor() {
    this.backgroundColorField = H5PEditor.findField('backgroundSettings/backgroundColor', this.parent);

    if (!this.backgroundColorField) {
      throw H5PEditor.t('core', 'unknownFieldPath', { ':path': this.backgroundColorField });
    }

    this.ideaBoardView.setBackgroundColor(this.backgroundColorField.params);

    this.backgroundColorField.changes.push((change) => {
      this.ideaBoardView.setBackgroundColor(this.backgroundColorField.params);
    });
  }

  /**
   * Update board parameter Values.
   * @param {object} values Values to be stored. Must match the field's params!
   */
  updateValue(values) {
    this.params = values;
    this.setValue(this.field, this.params);
  }
}
