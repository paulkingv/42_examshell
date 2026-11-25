//# headers | Header include | given
//! Given by the exam and unchanged: the header brings in read, malloc, free and BUFFER_SIZE.
#include "get_next_line.h"

//# ft_strchr | ft_strchr() · 1 fix
//! Find the first c in s. Bug: the loop never checks for the end of the string, so it runs past it when c is missing. Fix: one extra condition.
//~ Declare: a string and the character to find
char *ft_strchr(char *s, int c)
{
//~ Start at position 0
  int i = 0;
//? Walk while the string goes on AND this is not c || Was: while(s[i] != c). Adding s[i] && makes it stop at the end mark.
  while(s[i] && s[i] != c)
//~ Step to the next position
    i++;
//~ Did we stop on c?
  if (s[i] == c)
//~ Return a pointer to that spot
    return s + i;
//~ Otherwise...
  else
//~ ...c is not in the string
    return NULL;
}

//# ft_memcpy | ft_memcpy() · 2 fixes
//! Copy n bytes, from the last byte down to the first. Bug: --n skips one byte and wraps around when n is 0. Fix: n-- in the test, and plain [n] as the index.
//~ Declare: destination, source and a byte count
void *ft_memcpy(void *dest, const void *src, size_t n)
{
//? Loop n times, counting n down || Was: while(--n > 0). Test first, then lower n: inside the loop n runs from the last index down to 0.
  while(n-- > 0)
//? Copy the byte at index n || Was: [n - 1] on both sides. n is already the right index now.
    ((char *)dest)[n] = ((char *)src)[n];
//~ Return the destination
  return dest;
}

//# ft_strlen | ft_strlen() · 1 fix
//! Count the characters of a string. Bug: the line starts as NULL and gets measured, so *s crashes. Fix: two new lines that say a NULL string has length 0.
//~ Declare: it takes a string and returns a size
size_t ft_strlen(char *s)
{
//~ The count starts at 0
  size_t res = 0;
//? Is there no string at all? || New line. str_append_mem measures the line, which starts as NULL.
  if (!s)
//? Then its length is 0 || New line.
    return 0;
//~ While we are not on the end mark
  while (*s)
  {
//~ Move to the next character
    s++;
//~ Count one more
    res++;
  }
//~ Return the count
  return res;
}

//# str_append_mem | str_append_mem() | given
//! Unchanged: builds a new string = old line + size2 bytes of s2, and frees the old one. It works once ft_strlen accepts NULL.
int str_append_mem(char **s1, char *s2, size_t size2)
{
  size_t size1 = ft_strlen(*s1);
  char *tmp = malloc(size2 + size1 + 1);
  if (!tmp)
    return 0;
  ft_memcpy(tmp, *s1, size1);
  ft_memcpy(tmp + size1, s2, size2);
  tmp[size1 + size2] = '\0';
  free(*s1);
  *s1 = tmp;
  return 1;
}

//# str_append_str | str_append_str() | given
//! Unchanged: the same, for a whole string.
int str_append_str(char **s1, char *s2)
{
  return str_append_mem(s1, s2, ft_strlen(s2));
}

//# ft_memmove | ft_memmove() · 4 fixes
//! Copy n bytes when the areas may overlap. Bugs: it calls itself forever, measures with strlen instead of n, and counts a size_t down past 0. Fix: call ft_memcpy, and copy forward from 0 to n.
//~ Declare: destination, source and a byte count
void *ft_memmove(void *dest, const void *src, size_t n)
{
//~ Is the destination after the source?
  if (dest > src)
//? Then copy backwards with ft_memcpy || Was: return ft_memmove(dest, src, n); It called itself and never returned.
    return ft_memcpy(dest, src, n);
//~ Is it the same place?
  else if (dest == src)
//~ Then there is nothing to copy
    return dest;
//? A forward index, starting at 0 || Was: size_t i = ft_strlen((char *)src) - 1; The count is n, and we go forward.
  size_t i = 0;
//? While there are bytes left || Was: while (i >= 0). A size_t is never below 0, so that never ended.
  while (i < n)
  {
//~ Copy one byte
    ((char *)dest)[i] = ((char *)src)[i];
//? Next byte || Was: i--. We go forward now.
    i++;
  }
//~ Return the destination
  return dest;
}

//# gnl | get_next_line() · 3 fixes
//! Bugs: end of file loops forever, the buffer is never searched again, and the rest after the line break is never kept. Fixes: a full read_ret <= 0 block, a new strchr inside the loop, and a memmove before returning.
//~ Declare: it takes a file descriptor and returns one line
char *get_next_line(int fd)
{
//~ The leftover buffer: static, so it survives between calls
  static char b[BUFFER_SIZE + 1] = "";
//~ The line being built: nothing yet
  char *ret = NULL;
//~ Look for a line break in what is left from the last call
  char *tmp = ft_strchr(b, '\n');
//~ As long as the buffer holds no line break
  while(!tmp)
  {
//~ Add the whole buffer to the line. If that fails...
    if (!str_append_str(&ret, b))
//~ ...give up
      return (NULL);
//~ Refill the buffer from the file
    int read_ret = read(fd, b, BUFFER_SIZE);
//? End of file or read error? || Was: if (read_ret == -1) return (NULL); At end of file (0) it looped forever, and on error it leaked ret.
    if (read_ret <= 0)
    {
//? Empty the buffer || New. Its text is already in the line, so it must not come back next call.
      b[0] = '\0';
//? Clean end of file, and the line has some text? || New.
      if (read_ret == 0 && ret && *ret)
//? Return that last line, even without a line break || New.
        return (ret);
//? Otherwise free the line || New. The original leaked it.
      free(ret);
//? ...and report that nothing is left || This line was already there, after the old if. It now sits inside the new block.
      return (NULL);
    }
//~ Put the end mark after the bytes that were read
    b[read_ret] = 0;
//? Look for a line break again || New line. Without it tmp stays NULL and the loop never ends.
    tmp = ft_strchr(b, '\n');
  }
//~ Add the buffer up to and including the line break. If that fails...
  if (!str_append_mem(&ret, b, tmp - b + 1))
  {
//~ ...free the line
    free(ret);
//~ ...and give up
    return NULL;
  }
//? Slide what comes after the break to the front of the buffer || New line. Without it the next call returns the same line again. The +1 carries the end mark along.
  ft_memmove(b, tmp + 1, ft_strlen(tmp + 1) + 1);
//~ Return the finished line
  return ret;
}
