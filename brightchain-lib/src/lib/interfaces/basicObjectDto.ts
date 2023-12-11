export interface IBasicObjectDTO {
  /**
   * ID of the data object. Must be unique, usually UUID v4.
   */
  id: string;
  /**
   * The date this object was created
   */
  dateCreated: Date;
}