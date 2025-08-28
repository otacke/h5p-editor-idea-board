import { callOnceVisible, htmlToText, textToCardHTMLs } from './services/util.js';

export default class IdeaBoard extends H5P.EventDispatcher {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params, setValue) {
    super();

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
    this.fieldInstance = new H5PEditor.widgets[this.field.type](this.parent, this.field, this.params, () => {});

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
      .filter((key) => key.startsWith('H5P.IdeaBoard '))
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

  /**
   * Handle ready state.
   * @param {function} callback Callback to be invoked when ready.
   */
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
    /**
     * Workaround for H5P.VerticalTabs that does not call a resize event when changing tabs.
     */
    callOnceVisible(this.$container.get(0), () => {
      this.ideaBoardView.trigger('resize');
    });

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

    this.initializeTitleChangeListener();

    // Workaround for H5PEditor core library widget that does not inform about ready state.
    if (!(this.parent instanceof H5PEditor.Form)) {
      this.parent.trigger?.('ready');
    }
  }

  /**
   * Make cards list instance available.
   */
  makeCardsListInstanceAvailable() {
    this.cardsListInstance = H5PEditor.findField('cards', this.fieldInstance);

    if (!this.cardsListInstance) {
      throw H5PEditor.t('core', 'unknownFieldPath', { ':path': this.cardsListInstance });
    }
  }

  /**
   * Add a new card group to the board.
   * @param {object} params Parameters for the new card group.
   */
  addCardGroup(params) {
    if (!this.cardsListInstance) {
      return;
    }

    this.cardsListInstance.addItem(params);
  }

  /**
   * Remove a card group from the board.
   * @param {number} index Index of the card group to remove.
   */
  removeCardGroup(index) {
    if (!this.cardsListInstance) {
      return;
    }

    this.cardsListInstance.removeItem(index);
  }

  /**
   * Move a card group from one index to another.
   * @param {number} fromIndex Index to move the card group from.
   * @param {number} toIndex Index to move the card group to.
   */
  moveCardGroup(fromIndex, toIndex) {
    if (!this.cardsListInstance) {
      return;
    }

    this.cardsListInstance.moveItem(fromIndex, toIndex);
  }

  /**
   * Get the instance of a card group at a specific index.
   * @param {number} index Index of the card group.
   * @returns {object|boolean} The card group instance or false if not found.
   */
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
    values.cards = (values.cards || []).map((card) => {

      card.telemetry = card.telemetry || {};
      card.telemetry.height = `${card.telemetry.height ?? 10}`;
      card.telemetry.width = `${card.telemetry.width ?? 10}`;
      card.telemetry.x = `${card.telemetry.x ?? 0}`;
      card.telemetry.y = `${card.telemetry.y ?? 0}`;

      return card;
    });

    this.params = values;
    this.setValue(this.field, this.params);
  }

  /**
   * Get textual representation of the board.
   * @returns {string} Textual representation of the board.
   */
  getTextualRepresentation() {
    return this.params.cards
      .filter((card) => card.contentType.library.startsWith('H5P.EditableText'))
      .map((card) => htmlToText(card.contentType.params.text))
      .join('\n\n');
  }

  /**
   * Set the board from a textual representation.
   * @param {string} text Textual representation of the board.
   */
  setFromTextualRepresentation(text) {
    const cardHTMLs = textToCardHTMLs(text);
    this.ideaBoardView.clearBoard();
    this.ideaBoardView.addTextCards(cardHTMLs);
  }

  /**
   * Toggle the visibility of the board.
   * @param {boolean} state True to show the board, false to hide it.
   */
  toggleBoardVisibility(state) {
    this.ideaBoardView.toggleBoardVisibility(state);
  }

  /**
   * Initialize title change listener.
   */
  initializeTitleChangeListener() {
    this.coreTitleField = this.$container[0].parentNode?.querySelector('.field-name-extraTitle input.h5peditor-text');
    if (!this.coreTitleField) {
      return;
    }

    this.coreTitleField.addEventListener('change', () => {
      this.trigger('titleChanged', { title: this.getCoreTitleFieldTitle() });
    });
    this.trigger('titleChanged', { title: this.getCoreTitleFieldTitle() });
  }

  /**
   * Get the title from the core title field.
   * @returns {string} The title from the core title field.
   */
  getCoreTitleFieldTitle() {
    return this.coreTitleField.value;
  }
}
