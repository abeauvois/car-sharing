import * as aq from 'arquero';
import {getValidIndices, keepValidColumns} from './ai.ts'

describe('getValidIndices', () => {
  it('should keep columns with long content to be just a property value', () => {

    const data = {
        id: "any id",
        name: "<NAME>",
        description: "A really long description that should not be removed"
    }

    const result = getValidIndices(data);

    expect(result).toEqual([0,1,2]);
  });

  it('should remove columns with multiple lines', () => {
    const data = {
        id: "any id",
        name: "<NAME>",
        description: "A multi line \n description that should be removed"
    }

    const result = getValidIndices(data);

    expect(result).toEqual([0, 1]);
  });

  it('should handle empty data', () => {
    const data = {
        id: "any id",
        name: "",
        description: "A multi line description that should be removed"
    }

    const result = getValidIndices(data);

    expect(result).toEqual([0,1, 2]);
  });


});
