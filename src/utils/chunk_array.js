/**
 * Split an array into separate chunks
 * @param {Array} arr Array to separate into chunks
 * @param {int} size Max size of the chunks
 */
function chunkArray(array, batchSize) {
  const batches = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

module.exports = chunkArray;