//# headers | Headers | given
//! Given by the exam: variable arguments, FILE streams, and isspace / isdigit.
#include <ctype.h>
#include <stdarg.h>
#include <stdio.h>

//# match_space | match_space()
//! Skip every blank character waiting in the stream, and leave the first non-blank one unread.
//? Declare the function: it only needs the stream
int	match_space(FILE *f)
{
//? Read the first character
	int	c = fgetc(f);

//? While there is a character and it is a blank...
	while (c != EOF && isspace(c))
//? ...read the next one
		c = fgetc(f);
//? Did we stop on a real character?
	if (c != EOF)
//? Push it back into the stream || It was read one step too far. The next reader must see it.
		ungetc(c, f);
//? Did reading break?
	if (ferror(f))
//? Report failure
		return (-1);
//? Report success
	return (1);
}

//# match_char | match_char()
//! The format contains a plain character: the next input character has to be exactly that one.
//? Declare: the stream and the character we expect
int	match_char(FILE *f, char c)
{
//? Read one character
	int	ch = fgetc(f);

//? Is it the expected one?
	if (ch == c)
//? Match: success
		return (1);
//? No match, but was it a real character?
	if (ch != EOF)
//? Push it back
		ungetc(ch, f);
//? Report failure
	return (-1);
}

//# scan_char | scan_char()
//! %c: take exactly one character, blanks included, and store it.
//? Declare: the stream and the list of pointers to fill
int	scan_char(FILE *f, va_list ap)
{
//? Read one character
	int	c = fgetc(f);

//? Nothing left to read?
	if (c == EOF)
//? Report failure
		return (-1);
//? Take the next char pointer from the list and store the character through it || va_arg hands out the caller's arguments one by one.
	*va_arg(ap, char *) = c;
//? Report success
	return (1);
}

//# scan_int | scan_int()
//! %d: read an optional sign and then digits, build the number, and store it. No digit means failure.
//? Declare: the stream and the list of pointers to fill
int	scan_int(FILE *f, va_list ap)
{
//? Read the first character
	int	c = fgetc(f);
//? Assume the number is positive
	int	sign = 1;
//? The number starts at 0
	int	n = 0;

//? Is the first character a sign?
	if (c == '-' || c == '+')
	{
//? Is it a minus?
		if (c == '-')
//? Remember the number is negative
			sign = -1;
//? Move on to the character after the sign
		c = fgetc(f);
	}
//? Is this not a digit?
	if (!isdigit(c))
	{
//? If it is a real character...
		if (c != EOF)
//? ...push it back
			ungetc(c, f);
//? Not a number: failure
		return (-1);
	}
//? As long as we see digits
	while (isdigit(c))
	{
//? Shift the number one place to the left and add the digit || c - '0' turns the character '7' into the value 7.
		n = n * 10 + (c - '0');
//? Read the next character
		c = fgetc(f);
	}
//? Did we stop on a real character?
	if (c != EOF)
//? Push it back || It belongs to whatever comes after the number.
		ungetc(c, f);
//? Take the next int pointer from the list and store the signed number
	*va_arg(ap, int *) = n * sign;
//? Report success
	return (1);
}

//# scan_string | scan_string()
//! %s: copy characters into the caller's buffer until a blank or the end, then close the string.
//? Declare: the stream and the list of pointers to fill
int	scan_string(FILE *f, va_list ap)
{
//? Take the next char pointer from the list: the buffer to fill
	char	*s = va_arg(ap, char *);
//? Read the first character
	int		c = fgetc(f);
//? The write position in the buffer: 0
	int		i = 0;

//? While there is a character and it is not a blank
	while (c != EOF && !isspace(c))
	{
//? Store it and move the write position
		s[i++] = c;
//? Read the next character
		c = fgetc(f);
	}
//? Did we stop on a real character?
	if (c != EOF)
//? Push it back
		ungetc(c, f);
//? Was nothing copied?
	if (i == 0)
//? Report failure
		return (-1);
//? Close the string with the end mark
	s[i] = '\0';
//? Report success
	return (1);
}

//# match_conv | match_conv() | given
//! Given by the exam: looks at the letter after % and calls the matching scan function. %d and %s skip blanks first, %c does not.
int	match_conv(FILE *f, const char **format, va_list ap)
{
	switch (**format)
	{
		case 'c':
			return (scan_char(f, ap));
		case 'd':
			match_space(f);
			return (scan_int(f, ap));
		case 's':
			match_space(f);
			return (scan_string(f, ap));
		case EOF:
			return (-1);
		default:
			return (-1);
	}
}

//# ft_vfscanf | ft_vfscanf() | given
//! Given by the exam: walks the format string. A % calls match_conv, a blank calls match_space, anything else must match exactly. Returns how many conversions worked.
int	ft_vfscanf(FILE *f, const char *format, va_list ap)
{
	int nconv = 0;

	int c = fgetc(f);
	if (c == EOF)
		return (EOF);
	ungetc(c, f);

	while (*format)
	{
		if (*format == '%')
		{
			format++;
			if (match_conv(f, &format, ap) != 1)
				break;
			else
				nconv++;
		}
		else if (isspace(*format))
		{
			if (match_space(f) == -1)
				break;
		}
		else if (match_char(f, *format) != 1)
			break;
		format++;
	}

	if (ferror(f))
		return (EOF);
	return (nconv);
}

//# ft_scanf | ft_scanf()
//! The public function: collect the variable arguments and hand everything to ft_vfscanf on stdin.
//? Declare: a format, then any number of arguments || The ... is what makes the function variadic.
int	ft_scanf(const char *format, ...)
{
//? Declare the argument list
	va_list	ap;

//? Point the list at the first argument after format
	va_start(ap, format);
//? Run the real scanner on stdin and keep its result
	int ret = ft_vfscanf(stdin, format, ap);
//? Close the argument list
	va_end(ap);
//? Return the number of conversions
	return (ret);
}
