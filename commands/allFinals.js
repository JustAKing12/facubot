const { SlashCommandBuilder, bold } = require('discord.js');
const { logInfo, logError, getSubjectName, getAllRecordsOf, recordInfoUtils, getYearOfFinal, getAsMoment } = require('../common.js');
const { NoFinalsFoundError, NoFinalsFromYearError } = require('../exceptions.js');

const commandSchema = new SlashCommandBuilder()
        .setName('finales')
        .setDescription('Te da todos los finales existentes de una materia.')
        .addStringOption(option =>
            option.setName('materia')
            .setDescription('La materia que querés buscar.')    
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('año')
                .setDescription('El año en el que fueron tomados.')
                .setRequired(false)
        );

const getFinalsFromYear = (year, allFinals) => {
    const allFinalsFromYear = allFinals.filter(f => getYearOfFinal(f) == year) || [];
    return allFinalsFromYear;
}

module.exports = {
    data: commandSchema,
    async execute(interaction) {
        const getValueOf = option => {
            if (interaction.options.get(option) !== null)
                return interaction.options.get(option)['value'];
        };

        try {
            const subject = getValueOf('materia');
            const fullSubjectName = await getSubjectName(subject, interaction);
            const allMatchedFinals = await getAllRecordsOf('Final', fullSubjectName, interaction);
            if (allMatchedFinals.length == 0) {
                throw NoFinalsFoundError(fullSubjectName);
            }

            const date = getAsMoment(getValueOf('año'));
            const year = (date) ? date.format('YYYY') : undefined;

            let finals = allMatchedFinals;

            // if the user decided to look for a specific year, search for it and get all its finals
            if (year) {
                console.log(`${logInfo} - Trying to get all finals from ${year}`);
                finals = getFinalsFromYear(year, allMatchedFinals);
                if (finals.length == 0) {
                    console.log(`${logInfo} - No finals found from ${year}, returning`);
                    throw NoFinalsFromYearError(year);
                }
            }

            const replyMessage =
                (year) ?
                `${bold(fullSubjectName.toUpperCase())}\nEncontré ${finals.length} finales del ${bold(year)}. Usalos sabiamente.` :
                `${bold(fullSubjectName.toUpperCase())}\nEncontré ${finals.length} finales en total. Tenés para rato. :)`;

            const allFiles = finals.map(final => {
                const finalURL = recordInfoUtils.getRecordURL(final);
                return { attachment: finalURL };
            });

            await interaction.reply({
                files: allFiles,
                content: replyMessage,
            });
                
            console.log(`${logInfo} - Successfully sent ${finals.length} finals`);
        } catch(error) {
            console.error(`${logError} - Info: ${error}, command: /finales`);
            interaction.reply({ content: `Hubo un error al buscar los finales, ${interaction.user}: ${error}`, ephemeral: true });
        }
    },
    getFinalsFromYear,
};